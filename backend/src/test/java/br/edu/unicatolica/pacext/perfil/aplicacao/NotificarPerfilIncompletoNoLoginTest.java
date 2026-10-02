package br.edu.unicatolica.pacext.perfil.aplicacao;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.identidade.LoginRealizado;
import br.edu.unicatolica.pacext.notificacoes.NotificacaoEmissor;
import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademico;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademicoRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Testa {@link NotificarPerfilIncompletoNoLogin} isoladamente — Story 10.1 (RF20.1). */
class NotificarPerfilIncompletoNoLoginTest {

    private static final Long USUARIO_ID = 42L;

    private final PerfilAcademicoRepository perfilAcademicoRepository = mock(PerfilAcademicoRepository.class);
    private final NotificacaoEmissor notificacaoEmissor = mock(NotificacaoEmissor.class);
    private final NotificarPerfilIncompletoNoLogin observer = new NotificarPerfilIncompletoNoLogin();

    NotificarPerfilIncompletoNoLoginTest() {
        observer.perfilAcademicoRepository = perfilAcademicoRepository;
        observer.notificacaoEmissor = notificacaoEmissor;
        when(perfilAcademicoRepository.buscarPorUsuarioId(USUARIO_ID)).thenReturn(Optional.empty());
    }

    @Test
    void primeiroLoginNuncaNotifica() {
        observer.aoLogar(new LoginRealizado(USUARIO_ID, 1));

        verify(notificacaoEmissor, never()).notificar(any(), any(), any(), any());
    }

    @Test
    void segundoLoginSemPerfilNotifica() {
        observer.aoLogar(new LoginRealizado(USUARIO_ID, 2));

        verify(notificacaoEmissor).notificar(USUARIO_ID, TipoNotificacao.ONBOARDING_PERFIL,
                "Complete seu perfil e apareça mais nas buscas - adicione seus interesses.", "/perfil");
    }

    @Test
    void loginComPerfilSemInteressesNotifica() {
        PerfilAcademico perfil = new PerfilAcademico();
        when(perfilAcademicoRepository.buscarPorUsuarioId(USUARIO_ID)).thenReturn(Optional.of(perfil));

        observer.aoLogar(new LoginRealizado(USUARIO_ID, 3));

        verify(notificacaoEmissor).notificar(any(), any(), any(), any());
    }

    @Test
    void loginComPerfilComInteressesNaoNotifica() {
        PerfilAcademico perfil = new PerfilAcademico();
        perfil.interesses.add("Java");
        when(perfilAcademicoRepository.buscarPorUsuarioId(USUARIO_ID)).thenReturn(Optional.of(perfil));

        observer.aoLogar(new LoginRealizado(USUARIO_ID, 5));

        verify(notificacaoEmissor, never()).notificar(any(), any(), any(), any());
    }

    @Test
    void naoNotificaDeNovoSeJaExisteAvisoNaoLidoDoTipo() {
        when(notificacaoEmissor.possuiNaoLidaDoTipo(USUARIO_ID, TipoNotificacao.ONBOARDING_PERFIL)).thenReturn(true);

        observer.aoLogar(new LoginRealizado(USUARIO_ID, 4));

        verify(notificacaoEmissor, never()).notificar(any(), any(), any(), any());
    }

    @Test
    void falhaAoAvaliarNaoPropagaExcecao() {
        when(perfilAcademicoRepository.buscarPorUsuarioId(USUARIO_ID))
                .thenThrow(new RuntimeException("falha simulada"));

        observer.aoLogar(new LoginRealizado(USUARIO_ID, 2));
    }
}
