package br.edu.unicatolica.pacext.identidade.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;

/** Repository do módulo Identidade — único ponto de acesso à tabela {@code curso} (AD-3). */
@ApplicationScoped
public class CursoRepository implements PanacheRepository<Curso> {

    /** {@code GET /cursos} — só ativos, em ordem alfabética. */
    public List<Curso> listarAtivos() {
        return list("ativo = true order by nome");
    }

    /** Cadastro e perfil só aceitam curso ativo ({@code CURSO_INVALIDO} caso contrário). */
    public Optional<Curso> buscarAtivo(Long id) {
        return find("id = ?1 and ativo = true", id).firstResultOptional();
    }
}
