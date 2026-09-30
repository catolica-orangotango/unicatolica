package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.comunidades.AutoJoinCursoService;
import br.edu.unicatolica.pacext.identidade.CursoDoUsuarioAlterado;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/**
 * Troca o aluno de comunidade de curso quando o curso muda no perfil (Story 4.1, RF24.1):
 * sai da comunidade do curso anterior e entra na do novo. Observer síncrono: roda na
 * transação da edição do perfil, então uma falha aqui desfaz a edição.
 */
@ApplicationScoped
class AutoJoinNaTrocaDeCurso {

    @Inject
    AutoJoinCursoService autoJoinCursoService;

    void aoTrocarCurso(@Observes CursoDoUsuarioAlterado evento) {
        autoJoinCursoService.sincronizarCursoDoAluno(evento.usuarioId(), evento.cursoAnterior(), evento.cursoNovo());
    }
}
