package br.edu.unicatolica.pacext.identidade.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.seguranca.Perfis;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/** Acesso à área de administração da plataforma: só perfil {@code ADMINISTRADOR}. */
@ApplicationScoped
public class AdminService {

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /** @return o perfil que liberou o painel. */
    public String painel() {
        usuarioAutenticado.exigirAdministrador();
        return Perfis.ADMINISTRADOR;
    }
}
