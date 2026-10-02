package br.edu.unicatolica.pacext.perfil.aplicacao;

import br.edu.unicatolica.pacext.identidade.LoginRealizado;
import br.edu.unicatolica.pacext.notificacoes.NotificacaoEmissor;
import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademicoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

/**
 * Onboarding progressivo (Story 4.3/10.1, RF20.1): a partir do 2º login, se o aluno ainda
 * não definiu nenhum interesse no perfil acadêmico, pede um aviso a Notificações. Observer
 * síncrono na mesma transação do login ({@code AuthService.autenticar} é
 * {@code @Transactional}) — por isso todo o corpo fica em try/catch: uma falha aqui nunca
 * pode impedir o login.
 */
@ApplicationScoped
class NotificarPerfilIncompletoNoLogin {

    private static final Logger LOG = Logger.getLogger(NotificarPerfilIncompletoNoLogin.class);
    private static final int LOGIN_MINIMO_PARA_AVISAR = 2;
    private static final String TEXTO = "Complete seu perfil e apareça mais nas buscas - adicione seus interesses.";
    private static final String LINK = "/perfil";

    @Inject
    PerfilAcademicoRepository perfilAcademicoRepository;

    @Inject
    NotificacaoEmissor notificacaoEmissor;

    void aoLogar(@Observes LoginRealizado evento) {
        try {
            avaliar(evento);
        } catch (RuntimeException e) {
            LOG.warnf(e, "Falha ao avaliar onboarding de perfil incompleto para usuarioId=%d",
                    evento.usuarioId());
        }
    }

    private void avaliar(LoginRealizado evento) {
        if (evento.totalLogins() < LOGIN_MINIMO_PARA_AVISAR) {
            return;
        }
        boolean temInteresses = perfilAcademicoRepository.buscarPorUsuarioId(evento.usuarioId())
                .map(perfil -> !perfil.interesses.isEmpty())
                .orElse(false);
        if (temInteresses) {
            return;
        }
        if (notificacaoEmissor.possuiNaoLidaDoTipo(evento.usuarioId(), TipoNotificacao.ONBOARDING_PERFIL)) {
            return;
        }
        notificacaoEmissor.notificar(evento.usuarioId(), TipoNotificacao.ONBOARDING_PERFIL, TEXTO, LINK);
    }
}
