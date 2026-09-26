package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.comunidades.AutoJoinCursoService;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import br.edu.unicatolica.pacext.identidade.UsuarioCadastrado;
import org.junit.jupiter.api.Test;

/** Testa {@link AutoJoinNoCadastro} isoladamente: o evento vira a primeira definição de curso. */
class AutoJoinNoCadastroTest {

    @Test
    void cadastroSincronizaCursoSemCursoAnterior() {
        AutoJoinNoCadastro observer = new AutoJoinNoCadastro();
        observer.autoJoinCursoService = mock(AutoJoinCursoService.class);

        observer.aoCadastrar(new UsuarioCadastrado(42L, "Administração"));

        verify(observer.autoJoinCursoService).sincronizarCursoDoAluno(42L, null, "Administração");
    }
}
