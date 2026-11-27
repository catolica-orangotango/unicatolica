package br.edu.unicatolica.pacext.notificacoes.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import br.edu.unicatolica.pacext.notificacoes.dominio.Notificacao;
import br.edu.unicatolica.pacext.notificacoes.dominio.NotificacaoRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** Testa {@link NotificacaoService} isoladamente com Mockito — Story 10.1. */
class NotificacaoServiceTest {

    private static final Long USUARIO_ID = 42L;

    private final NotificacaoRepository repository = mock(NotificacaoRepository.class);
    private final NotificacaoService service = new NotificacaoService();

    NotificacaoServiceTest() {
        service.notificacaoRepository = repository;
    }

    @Test
    void notificarPersisteComLidaFalseECriadoEmPreenchido() {
        service.notificar(USUARIO_ID, TipoNotificacao.ONBOARDING_PERFIL, "texto", "/perfil");

        ArgumentCaptor<Notificacao> captor = ArgumentCaptor.forClass(Notificacao.class);
        verify(repository).persist(captor.capture());
        Notificacao notificacao = captor.getValue();
        assertEquals(USUARIO_ID, notificacao.usuarioId);
        assertEquals(TipoNotificacao.ONBOARDING_PERFIL, notificacao.tipo);
        assertEquals("texto", notificacao.texto);
        assertEquals("/perfil", notificacao.link);
        assertFalse(notificacao.lida);
        assertNotNull(notificacao.criadoEm);
    }

    @Test
    void possuiNaoLidaDoTipoDelegaAoRepository() {
        when(repository.existeNaoLidaDoTipo(USUARIO_ID, TipoNotificacao.ONBOARDING_PERFIL)).thenReturn(true);

        assertTrue(service.possuiNaoLidaDoTipo(USUARIO_ID, TipoNotificacao.ONBOARDING_PERFIL));
    }

    @Test
    void marcarComoLidaPorTipoDelegaAoRepository() {
        service.marcarComoLidaPorTipo(USUARIO_ID, TipoNotificacao.ONBOARDING_PERFIL);

        verify(repository).marcarLidasPorTipo(USUARIO_ID, TipoNotificacao.ONBOARDING_PERFIL);
    }

    @Test
    void listarDevolvePageResponseComTotalDoRepository() {
        Notificacao notificacao = new Notificacao();
        notificacao.id = 1L;
        when(repository.listarPorUsuario(USUARIO_ID, 0, 20)).thenReturn(List.of(notificacao));
        when(repository.contarPorUsuario(USUARIO_ID)).thenReturn(1L);

        PageResponse<Notificacao> pagina = service.listar(USUARIO_ID, 0, 20);

        assertEquals(1, pagina.content().size());
        assertEquals(1L, pagina.totalElements());
    }

    @Test
    void marcarComoLidaAtualizaANotificacaoDoProprioUsuario() {
        Notificacao notificacao = new Notificacao();
        notificacao.id = 7L;
        notificacao.usuarioId = USUARIO_ID;
        notificacao.lida = false;
        when(repository.buscarPorIdEUsuario(7L, USUARIO_ID)).thenReturn(Optional.of(notificacao));

        service.marcarComoLida(USUARIO_ID, 7L);

        assertTrue(notificacao.lida);
    }

    @Test
    void marcarComoLidaDeNotificacaoInexistenteOuDeOutroUsuarioDa404() {
        when(repository.buscarPorIdEUsuario(7L, USUARIO_ID)).thenReturn(Optional.empty());

        ApiException erro = assertThrows(ApiException.class, () -> service.marcarComoLida(USUARIO_ID, 7L));

        assertEquals(404, erro.getStatus());
        assertEquals("NOTIFICACAO_NAO_ENCONTRADA", erro.getCode());
    }

    @Test
    void listarAcimaDe20AjustaTamanhoPara20() {
        when(repository.listarPorUsuario(USUARIO_ID, 0, 20)).thenReturn(List.of());
        when(repository.contarPorUsuario(USUARIO_ID)).thenReturn(0L);

        PageResponse<Notificacao> pagina = service.listar(USUARIO_ID, 0, 100);

        assertEquals(20, pagina.size());
        verify(repository).listarPorUsuario(USUARIO_ID, 0, 20);
    }

    @Test
    void listarAbaixoDe1AjustaTamanhoPara1() {
        when(repository.listarPorUsuario(USUARIO_ID, 0, 1)).thenReturn(List.of());
        when(repository.contarPorUsuario(USUARIO_ID)).thenReturn(0L);

        PageResponse<Notificacao> pagina = service.listar(USUARIO_ID, 0, 0);

        assertEquals(1, pagina.size());
        verify(repository).listarPorUsuario(USUARIO_ID, 0, 1);
    }

    @Test
    void contarNaoLidasDelegaAoRepository() {
        when(repository.contarNaoLidas(USUARIO_ID)).thenReturn(5L);

        assertEquals(5L, service.contarNaoLidas(USUARIO_ID));
    }

    @Test
    void resumoCombinaTotalNaoLidasEUltimaNotificacaoIdDoRepository() {
        when(repository.contarNaoLidas(USUARIO_ID)).thenReturn(2L);
        when(repository.buscarIdMaisRecente(USUARIO_ID)).thenReturn(Optional.of(9L));

        ResumoNotificacoes resumo = service.resumo(USUARIO_ID);

        assertEquals(2L, resumo.totalNaoLidas());
        assertEquals(9L, resumo.ultimaNotificacaoId());
    }

    @Test
    void resumoSemNenhumaNotificacaoDevolveUltimaNotificacaoIdNula() {
        when(repository.contarNaoLidas(USUARIO_ID)).thenReturn(0L);
        when(repository.buscarIdMaisRecente(USUARIO_ID)).thenReturn(Optional.empty());

        ResumoNotificacoes resumo = service.resumo(USUARIO_ID);

        assertEquals(0L, resumo.totalNaoLidas());
        assertEquals(null, resumo.ultimaNotificacaoId());
    }

    @Test
    void marcarTodasComoLidasDelegaAoRepositoryComUmInstanteAtual() {
        service.marcarTodasComoLidas(USUARIO_ID);

        ArgumentCaptor<Instant> captor = ArgumentCaptor.forClass(Instant.class);
        verify(repository).marcarTodasComoLidas(eq(USUARIO_ID), captor.capture());
        assertNotNull(captor.getValue());
    }

    @Test
    void excluirRemoveANotificacaoDoProprioUsuario() {
        Notificacao notificacao = new Notificacao();
        notificacao.id = 7L;
        notificacao.usuarioId = USUARIO_ID;
        when(repository.buscarPorIdEUsuario(7L, USUARIO_ID)).thenReturn(Optional.of(notificacao));

        service.excluir(USUARIO_ID, 7L);

        verify(repository).delete(notificacao);
    }

    @Test
    void excluirNotificacaoInexistenteOuDeOutroUsuarioDa404() {
        when(repository.buscarPorIdEUsuario(7L, USUARIO_ID)).thenReturn(Optional.empty());

        ApiException erro = assertThrows(ApiException.class, () -> service.excluir(USUARIO_ID, 7L));

        assertEquals(404, erro.getStatus());
        assertEquals("NOTIFICACAO_NAO_ENCONTRADA", erro.getCode());
    }
}
