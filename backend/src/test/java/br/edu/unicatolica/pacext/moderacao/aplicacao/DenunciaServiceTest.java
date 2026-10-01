package br.edu.unicatolica.pacext.moderacao.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.moderacao.dominio.Denuncia;
import br.edu.unicatolica.pacext.moderacao.dominio.DenunciaRepository;
import br.edu.unicatolica.pacext.moderacao.dominio.SituacaoDenuncia;
import br.edu.unicatolica.pacext.moderacao.dominio.TipoConteudo;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeracao;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeravel;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testa {@link DenunciaService} isoladamente com Mockito — critérios da Story 12.1. */
class DenunciaServiceTest {

    private static final Long DENUNCIANTE = 42L;
    private static final Long AUTOR = 43L;
    private static final Long PUBLICACAO = 7L;

    private DenunciaService service;
    private DenunciaRepository repository;
    private PublicacaoModeracao publicacaoModeracao;
    private AuditoriaService auditoriaService;

    @BeforeEach
    void setUp() {
        service = new DenunciaService();
        repository = mock(DenunciaRepository.class);
        publicacaoModeracao = mock(PublicacaoModeracao.class);
        auditoriaService = mock(AuditoriaService.class);
        service.denunciaRepository = repository;
        service.publicacaoModeracao = publicacaoModeracao;
        service.auditoriaService = auditoriaService;

        when(publicacaoModeracao.buscar(PUBLICACAO)).thenReturn(Optional.of(publicacao(false)));
    }

    @Test
    void registraDenunciaPendenteComAutorDaPostagemEAudita() {
        Denuncia denuncia = service.registrar(DENUNCIANTE, "PUBLICACAO", PUBLICACAO, "  spam  ");

        verify(repository).persist(denuncia);
        assertEquals(TipoConteudo.PUBLICACAO, denuncia.tipoConteudo);
        assertEquals(PUBLICACAO, denuncia.conteudoId);
        assertEquals(AUTOR, denuncia.autorConteudoUsuarioId);
        assertEquals(DENUNCIANTE, denuncia.denuncianteUsuarioId);
        assertEquals("spam", denuncia.motivo);
        assertEquals(SituacaoDenuncia.PENDENTE, denuncia.situacao);
        assertNotNull(denuncia.criadoEm);
        verify(auditoriaService).registrar(eq(DENUNCIANTE), eq("moderacao"), eq("DENUNCIA_REGISTRADA"),
                eq("Denuncia"), any(), anyString());
    }

    @Test
    void tipoAusenteDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.registrar(DENUNCIANTE, null, PUBLICACAO, "spam"));
    }

    @Test
    void tipoForaDoContratoDa422() {
        assertCodigo(422, "TIPO_CONTEUDO_INVALIDO", () -> service.registrar(DENUNCIANTE, "COMENTARIO", PUBLICACAO, "spam"));
    }

    @Test
    void conteudoIdAusenteDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.registrar(DENUNCIANTE, "PUBLICACAO", null, "spam"));
    }

    @Test
    void motivoEmBrancoDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.registrar(DENUNCIANTE, "PUBLICACAO", PUBLICACAO, "  "));
    }

    @Test
    void motivoAcimaDoLimiteDa422() {
        String longo = "a".repeat(Motivo.TAMANHO_MAXIMO + 1);

        assertCodigo(422, "MOTIVO_MUITO_LONGO", () -> service.registrar(DENUNCIANTE, "PUBLICACAO", PUBLICACAO, longo));
    }

    @Test
    void postagemInexistenteDa404() {
        when(publicacaoModeracao.buscar(PUBLICACAO)).thenReturn(Optional.empty());

        assertCodigo(404, "CONTEUDO_NAO_ENCONTRADO", () -> service.registrar(DENUNCIANTE, "PUBLICACAO", PUBLICACAO, "spam"));
    }

    @Test
    void postagemOcultaDa404() {
        when(publicacaoModeracao.buscar(PUBLICACAO)).thenReturn(Optional.of(publicacao(true)));

        assertCodigo(404, "CONTEUDO_NAO_ENCONTRADO", () -> service.registrar(DENUNCIANTE, "PUBLICACAO", PUBLICACAO, "spam"));
    }

    @Test
    void proprioConteudoDa403() {
        assertCodigo(403, "DENUNCIA_PROPRIO_CONTEUDO", () -> service.registrar(AUTOR, "PUBLICACAO", PUBLICACAO, "spam"));
    }

    @Test
    void denunciaRepetidaDa409() {
        when(repository.existeDenuncia(TipoConteudo.PUBLICACAO, PUBLICACAO, DENUNCIANTE)).thenReturn(true);

        assertCodigo(409, "DENUNCIA_DUPLICADA", () -> service.registrar(DENUNCIANTE, "PUBLICACAO", PUBLICACAO, "spam"));
        verify(repository, never()).persist(any(Denuncia.class));
        verify(auditoriaService, never()).registrar(anyLong(), anyString(), anyString(), anyString(), anyLong(), anyString());
    }

    private static PublicacaoModeravel publicacao(boolean oculta) {
        return new PublicacaoModeravel(PUBLICACAO, 1L, AUTOR, "texto", Instant.now(), oculta);
    }

    private static void assertCodigo(int status, String code, Runnable acao) {
        ApiException erro = assertThrows(ApiException.class, acao::run);
        assertEquals(status, erro.getStatus());
        assertEquals(code, erro.getCode());
    }
}
