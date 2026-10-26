package br.edu.unicatolica.pacext.identidade.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.seguranca.Perfis;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuariosDeTeste;
import org.junit.jupiter.api.Test;

/** Testa {@link AdminService} isoladamente: a regra de autorização roda de verdade. */
class AdminServiceTest {

    private AdminService serviceComPerfil(String perfil) {
        AdminService service = new AdminService();
        service.usuarioAutenticado = UsuariosDeTeste.comPerfis(1L, perfil);
        return service;
    }

    @Test
    void administradorRecebeOPainel() {
        assertEquals(Perfis.ADMINISTRADOR, serviceComPerfil(Perfis.ADMINISTRADOR).painel());
    }

    @Test
    void alunoEModeradorRecebem403() {
        for (String perfil : new String[] {Perfis.ALUNO, Perfis.MODERADOR}) {
            ApiException erro = assertThrows(ApiException.class, serviceComPerfil(perfil)::painel);
            assertEquals(403, erro.getStatus());
            assertEquals("ACESSO_NEGADO", erro.getCode());
        }
    }
}
