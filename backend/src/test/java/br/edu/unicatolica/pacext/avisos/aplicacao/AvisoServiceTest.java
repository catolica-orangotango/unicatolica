package br.edu.unicatolica.pacext.avisos.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.avisos.dominio.Aviso;
import br.edu.unicatolica.pacext.avisos.dominio.AvisoRepository;
import br.edu.unicatolica.pacext.avisos.dominio.EscopoAviso;
import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.identidade.CursoConsulta;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testa {@link AvisoService} isoladamente com Mockito — critérios da Story 13.1 (RF81). */
class AvisoServiceTest {

    private static final Long ADMIN_ID = 7L;
    private static final Long CURSO_ID = 3L;

    private AvisoService service;
    private AvisoRepository repository;
    private CursoConsulta cursoConsulta;
    private UsuarioAutenticado usuarioAutenticado;
    private AuditoriaService auditoriaService;

    @BeforeEach
    void setUp() {
        service = new AvisoService();
        repository = mock(AvisoRepository.class);
        cursoConsulta = mock(CursoConsulta.class);
        usuarioAutenticado = mock(UsuarioAutenticado.class);
        auditoriaService = mock(AuditoriaService.class);
        service.avisoRepository = repository;
        service.cursoConsulta = cursoConsulta;
        service.usuarioAutenticado = usuarioAutenticado;
        service.auditoriaService = auditoriaService;

        when(usuarioAutenticado.id()).thenReturn(ADMIN_ID);
        when(cursoConsulta.nome(CURSO_ID)).thenReturn(Optional.of("Engenharia de Software"));
    }

    @Test
    void administradorPublicaAvisoGeralSemCurso() {
        Aviso aviso = service.publicar("  Feriado  ", " Sem aula na segunda. ", "GERAL", 99L, LocalDate.of(2026, 12, 7));

        verify(usuarioAutenticado).exigirAdministrador();
        verify(repository).persist(aviso);
        assertEquals("Feriado", aviso.titulo);
        assertEquals("Sem aula na segunda.", aviso.mensagem);
        assertEquals(EscopoAviso.GERAL, aviso.escopo);
        assertNull(aviso.cursoId, "o escopo GERAL ignora o cursoId");
        assertEquals(LocalDate.of(2026, 12, 7), aviso.dataDestaque);
        assertEquals(ADMIN_ID, aviso.autorUsuarioId);
        assertNotNull(aviso.criadoEm);
        verify(auditoriaService).registrar(ADMIN_ID, "avisos", "AVISO_PUBLICADO", "Aviso", aviso.id, "Aviso geral publicado.");
    }

    @Test
    void avisoDeCursoGuardaOCurso() {
        Aviso aviso = service.publicar("Palestra", "Auditório 2.", "CURSO", CURSO_ID, null);

        assertEquals(EscopoAviso.CURSO, aviso.escopo);
        assertEquals(CURSO_ID, aviso.cursoId);
        assertNull(aviso.dataDestaque);
    }

    @Test
    void quemNaoEAdministradorNaoPublicaNemListaEOServicoNaoGrava() {
        doThrow(ApiException.semPermissao("ACESSO_NEGADO", "Sem permissão.", null)).when(usuarioAutenticado)
                .exigirAdministrador();

        assertCodigo(403, "ACESSO_NEGADO", () -> service.publicar("t", "m", "GERAL", null, null));
        assertCodigo(403, "ACESSO_NEGADO", () -> service.listar(0, 20));

        verify(repository, never()).persist(any(Aviso.class));
        verifyNoInteractions(auditoriaService);
    }

    @Test
    void tituloEMensagemSaoObrigatorios() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.publicar(null, "m", "GERAL", null, null));
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.publicar("  ", "m", "GERAL", null, null));
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.publicar("t", null, "GERAL", null, null));
    }

    @Test
    void tituloEMensagemTemLimite() {
        String titulo = "a".repeat(AvisoService.TAMANHO_MAXIMO_TITULO + 1);
        String mensagem = "a".repeat(AvisoService.TAMANHO_MAXIMO_MENSAGEM + 1);

        assertCodigo(422, "CAMPO_MUITO_LONGO", () -> service.publicar(titulo, "m", "GERAL", null, null));
        assertCodigo(422, "CAMPO_MUITO_LONGO", () -> service.publicar("t", mensagem, "GERAL", null, null));
    }

    @Test
    void semEscopoOuEscopoInvalidoDa422() {
        assertCodigo(422, "ESCOPO_OBRIGATORIO", () -> service.publicar("t", "m", null, null, null));
        assertCodigo(422, "ESCOPO_OBRIGATORIO", () -> service.publicar("t", "m", "TODOS", null, null));
        assertCodigo(422, "ESCOPO_OBRIGATORIO", () -> service.publicar("t", "m", "geral", null, null));
    }

    @Test
    void escopoCursoSemCursoDa422() {
        assertCodigo(422, "CURSO_OBRIGATORIO", () -> service.publicar("t", "m", "CURSO", null, null));
    }

    @Test
    void escopoCursoComCursoInexistenteDa404() {
        when(cursoConsulta.nome(99L)).thenReturn(Optional.empty());

        assertCodigo(404, "CURSO_NAO_ENCONTRADO", () -> service.publicar("t", "m", "CURSO", 99L, null));
        verify(repository, never()).persist(any(Aviso.class));
    }

    @Test
    void listarTrazPaginaETamanhoParaDentroDaFaixa() {
        when(repository.count()).thenReturn(0L);

        var pagina = service.listar(-5, 1000);

        assertEquals(0, pagina.page());
        assertEquals(AvisoService.TAMANHO_MAXIMO_PAGINA, pagina.size());
        verify(repository).listarRecentes(0, AvisoService.TAMANHO_MAXIMO_PAGINA);
    }

    private static void assertCodigo(int status, String code, Runnable acao) {
        ApiException erro = assertThrows(ApiException.class, acao::run);
        assertEquals(status, erro.getStatus());
        assertEquals(code, erro.getCode());
    }
}
