package br.edu.unicatolica.pacext.perfil.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;

/** Repository do módulo Perfil — único ponto de acesso a {@code perfil_academico}/{@code perfil_interesse} (AD-3). */
@ApplicationScoped
public class PerfilAcademicoRepository implements PanacheRepository<PerfilAcademico> {

    /** Próprio perfil (Story 4.2) e perfil público de terceiros (Story 4.4). */
    public Optional<PerfilAcademico> buscarPorUsuarioId(Long usuarioId) {
        return find("usuarioId = ?1", usuarioId).firstResultOptional();
    }
}
