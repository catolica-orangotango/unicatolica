package br.edu.unicatolica.pacext.identidade.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.identidade.dominio.Curso;
import br.edu.unicatolica.pacext.identidade.dominio.CursoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;

/** Lista de cursos (decisão de 2026-09-30) — lida pelo cadastro e, depois, pelo perfil. */
@ApplicationScoped
public class CursoService {

    @Inject
    CursoRepository cursoRepository;

    /** {@code GET /cursos} — só ativos, em ordem alfabética. */
    public List<Curso> listarAtivos() {
        return cursoRepository.listarAtivos();
    }

    /** Cadastro e perfil só aceitam curso ativo de {@code GET /cursos}. */
    public Curso buscarAtivoOuFalhar(Long cursoId) {
        return cursoRepository.buscarAtivo(cursoId)
                .orElseThrow(() -> ApiException.validacao("CURSO_INVALIDO", "Escolha um curso da lista.", "cursoId"));
    }
}
