package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.comunidades.AutoJoinCursoService;
import br.edu.unicatolica.pacext.identidade.UsuarioCadastrado;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/**
 * Coloca o aluno recém-cadastrado na comunidade do curso (RF24.1). Observer síncrono: roda
 * na transação do cadastro, então uma falha aqui desfaz o cadastro.
 */
@ApplicationScoped
class AutoJoinNoCadastro {

    @Inject
    AutoJoinCursoService autoJoinCursoService;

    void aoCadastrar(@Observes UsuarioCadastrado evento) {
        autoJoinCursoService.sincronizarCursoDoAluno(evento.usuarioId(), null, evento.curso());
    }
}
