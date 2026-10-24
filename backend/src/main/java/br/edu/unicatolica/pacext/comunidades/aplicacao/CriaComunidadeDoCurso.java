package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.identidade.CursoCadastrado;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/**
 * Cria a comunidade de curso quando o administrador cadastra o curso (Story 2.1, RF21.2).
 * Observer síncrono: roda na transação do cadastro do curso, então uma falha aqui (nome já
 * usado por outra comunidade) desfaz o cadastro.
 */
@ApplicationScoped
class CriaComunidadeDoCurso {

    @Inject
    ComunidadeService comunidadeService;

    void aoCadastrarCurso(@Observes CursoCadastrado evento) {
        comunidadeService.criarComunidadeDeCurso(evento.cursoId(), evento.nome(), evento.criadoPorUsuarioId());
    }
}
