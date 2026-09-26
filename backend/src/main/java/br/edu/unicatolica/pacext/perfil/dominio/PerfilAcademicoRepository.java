package br.edu.unicatolica.pacext.perfil.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;

/** Repositório próprio do módulo Perfil Acadêmico — dono exclusivo de {@code perfil_academico} (AD-3). */
@ApplicationScoped
public class PerfilAcademicoRepository implements PanacheRepository<PerfilAcademico> {

    public Optional<PerfilAcademico> buscarPorUsuarioId(Long usuarioId) {
        return find("usuarioId", usuarioId).firstResultOptional();
    }
}
