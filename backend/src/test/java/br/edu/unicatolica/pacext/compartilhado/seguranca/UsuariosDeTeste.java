package br.edu.unicatolica.pacext.compartilhado.seguranca;

import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;

/**
 * Usuário autenticado de teste que executa a regra real de autorização
 * ({@code podeModerar}, {@code exigir*}); só a leitura do token é simulada.
 * Um {@code mock(UsuarioAutenticado.class)} puro faria {@code exigir*} virar no-op.
 */
public final class UsuariosDeTeste {

    private UsuariosDeTeste() {
    }

    public static UsuarioAutenticado comPerfis(Long id, String... perfis) {
        UsuarioAutenticado usuario = mock(UsuarioAutenticado.class, CALLS_REAL_METHODS);
        doReturn(id).when(usuario).id();
        doReturn(false).when(usuario).possuiPerfil(org.mockito.ArgumentMatchers.anyString());
        for (String perfil : perfis) {
            doReturn(true).when(usuario).possuiPerfil(perfil);
        }
        return usuario;
    }
}
