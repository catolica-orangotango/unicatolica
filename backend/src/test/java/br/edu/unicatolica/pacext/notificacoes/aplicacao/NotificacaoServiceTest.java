package br.edu.unicatolica.pacext.notificacoes.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import br.edu.unicatolica.pacext.notificacoes.dominio.Notificacao;
import br.edu.unicatolica.pacext.notificacoes.dominio.NotificacaoRepository;
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
}
