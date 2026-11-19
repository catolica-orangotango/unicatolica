package br.edu.unicatolica.pacext.enquetes.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

/** Repository de {@code enquete_voto} — só opções escolhidas, sem identidade (RF57.1). */
@ApplicationScoped
public class EnqueteVotoRepository implements PanacheRepository<EnqueteVoto> {
}
