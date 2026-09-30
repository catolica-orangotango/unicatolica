package br.edu.unicatolica.pacext.comunidades.aplicacao;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import br.edu.unicatolica.pacext.comunidades.AutoJoinCursoService;
import br.edu.unicatolica.pacext.identidade.CursoDoUsuarioAlterado;
import org.junit.jupiter.api.Test;

/** Testa {@link AutoJoinNaTrocaDeCurso} isoladamente: o evento vira a troca de comunidade de curso. */
class AutoJoinNaTrocaDeCursoTest {

    @Test
    void trocaDeCursoSincronizaComOCursoAnterior() {
        AutoJoinNaTrocaDeCurso observer = new AutoJoinNaTrocaDeCurso();
        observer.autoJoinCursoService = mock(AutoJoinCursoService.class);

        observer.aoTrocarCurso(new CursoDoUsuarioAlterado(42L, "Administração", "Direito"));

        verify(observer.autoJoinCursoService).sincronizarCursoDoAluno(42L, "Administração", "Direito");
    }
}
