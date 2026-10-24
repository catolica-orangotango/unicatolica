package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.identidade.CursoRenomeado;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/**
 * Renomeia a comunidade de curso quando o administrador renomeia o curso (KAN-44). A
 * comunidade guarda só o {@code cursoId}, então o vínculo e os membros continuam como estão.
 * Observer síncrono, na transação da renomeação do curso.
 */
@ApplicationScoped
class RenomeiaComunidadeDoCurso {

    @Inject
    ComunidadeService comunidadeService;

    void aoRenomearCurso(@Observes CursoRenomeado evento) {
        comunidadeService.renomearComunidadeDeCurso(evento.cursoId(), evento.nome());
    }
}
