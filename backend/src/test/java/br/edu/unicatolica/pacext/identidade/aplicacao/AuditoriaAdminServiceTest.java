package br.edu.unicatolica.pacext.identidade.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaConsulta;
import br.edu.unicatolica.pacext.compartilhado.auditoria.LogAuditoria;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.Perfis;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuariosDeTeste;
import br.edu.unicatolica.pacext.identidade.aplicacao.AuditoriaAdminService.RegistroComAutor;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** {@link AuditoriaAdminService} isolado: a regra de autorização roda de verdade (KAN-90). */
class AuditoriaAdminServiceTest {

    private static final Long ADMIN_ID = 1L;

    private final AuditoriaConsulta consulta = mock(AuditoriaConsulta.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final AuditoriaAdminService service = new AuditoriaAdminService();

    AuditoriaAdminServiceTest() {
        service.auditoriaConsulta = consulta;
        service.usuarioRepository = usuarioRepository;
        service.usuarioAutenticado = UsuariosDeTeste.comPerfis(ADMIN_ID, Perfis.ADMINISTRADOR);
        when(consulta.buscar(any(), anyInt(), anyInt())).thenReturn(PageResponse.de(List.of(), 0, 20, 0));
    }

    private AuditoriaConsulta.Filtro filtroEnviado(int pagina, int tamanho) {
        ArgumentCaptor<AuditoriaConsulta.Filtro> captor = ArgumentCaptor.forClass(AuditoriaConsulta.Filtro.class);
        verify(consulta).buscar(captor.capture(), eq(pagina), eq(tamanho));
        return captor.getValue();
    }

    private LogAuditoria log(Long usuarioId) {
        LogAuditoria log = new LogAuditoria();
        log.id = 10L;
        log.usuarioId = usuarioId;
        log.modulo = "identidade";
        log.acao = "LOGIN";
        log.criadoEm = Instant.now();
        return log;
    }

    @Test
    void filtrosVaziosOuSoComEspacosViramSemFiltro() {
        service.listar("", "  ", null, "   ", null, null, 0, 20);

        AuditoriaConsulta.Filtro filtro = filtroEnviado(0, 20);
        assertNull(filtro.modulo());
        assertNull(filtro.acao());
        assertNull(filtro.entidadeAfetada());
        assertNull(filtro.detalhes());
        assertNull(filtro.de());
        assertNull(filtro.ateExclusivo());
    }

    @Test
    void tamanhoAcimaDe20ViraVinteEPaginaNegativaViraZero() {
        service.listar(null, null, null, null, null, null, -3, 500);

        filtroEnviado(0, 20);
    }

    @Test
    void tamanhoAbaixoDeUmViraUm() {
        service.listar(null, null, null, null, null, null, 2, 0);

        filtroEnviado(2, 1);
    }

    @Test
    void detalhesComMenosDeTresCaracteresEIgnorado() {
        service.listar(null, null, null, "MO", null, null, 0, 20);

        assertNull(filtroEnviado(0, 20).detalhes());
    }

    @Test
    void detalhesComTresCaracteresPassaSemEspacosNasPontas() {
        service.listar(null, null, null, "  MOD ", null, null, 0, 20);

        assertEquals("MOD", filtroEnviado(0, 20).detalhes());
    }

    @Test
    void diasDoIntervaloSaoInclusivosNoFusoDeBrasilia() {
        service.listar("identidade", "LOGIN", "Usuario", null, LocalDate.of(2026, 3, 9), LocalDate.of(2026, 3, 9),
                0, 20);

        AuditoriaConsulta.Filtro filtro = filtroEnviado(0, 20);
        assertEquals("identidade", filtro.modulo());
        assertEquals("LOGIN", filtro.acao());
        assertEquals("Usuario", filtro.entidadeAfetada());
        assertEquals(Instant.parse("2026-03-09T03:00:00Z"), filtro.de());
        assertEquals(Instant.parse("2026-03-10T03:00:00Z"), filtro.ateExclusivo());
    }

    @Test
    void deDepoisDeAteDa422() {
        ApiException erro = assertThrows(ApiException.class, () -> service.listar(null, null, null, null,
                LocalDate.of(2026, 3, 10), LocalDate.of(2026, 3, 9), 0, 20));

        assertEquals(422, erro.getStatus());
        assertEquals("INTERVALO_DE_DATAS_INVALIDO", erro.getCode());
        verifyNoInteractions(consulta);
    }

    @Test
    void autorVemDaTabelaDeUsuariosEEventoDoSistemaFicaSemAutor() {
        Usuario autor = new Usuario();
        autor.id = 5L;
        autor.nome = "Maria";
        autor.email = "maria@catolicasc.edu.br";
        when(usuarioRepository.list(eq("id in ?1"), any(Object[].class))).thenReturn(List.of(autor));
        LogAuditoria deMaria = log(5L);
        LogAuditoria doSistema = log(null);
        LogAuditoria deQuemSumiu = log(99L);
        when(consulta.buscar(any(), anyInt(), anyInt()))
                .thenReturn(PageResponse.de(List.of(deMaria, doSistema, deQuemSumiu), 0, 20, 3));

        List<RegistroComAutor> conteudo = service.listar(null, null, null, null, null, null, 0, 20).content();

        assertSame(autor, conteudo.get(0).autor());
        assertNull(conteudo.get(1).autor());
        assertNull(conteudo.get(2).autor());
    }

    @Test
    void semLogComAutorNaoConsultaUsuarios() {
        when(consulta.buscar(any(), anyInt(), anyInt()))
                .thenReturn(PageResponse.de(List.of(log(null)), 0, 20, 1));

        service.listar(null, null, null, null, null, null, 0, 20);

        verify(usuarioRepository, never()).list(any(String.class), any(Object[].class));
    }

    @Test
    void alunoEModeradorRecebem403NasDuasOperacoes() {
        for (String perfil : new String[] {Perfis.ALUNO, Perfis.MODERADOR}) {
            service.usuarioAutenticado = UsuariosDeTeste.comPerfis(ADMIN_ID, perfil);

            ApiException naLista = assertThrows(ApiException.class,
                    () -> service.listar(null, null, null, null, null, null, 0, 20));
            ApiException nosFiltros = assertThrows(ApiException.class, () -> service.filtros());

            assertEquals(403, naLista.getStatus());
            assertEquals(403, nosFiltros.getStatus());
        }
        verifyNoInteractions(consulta);
    }
}
