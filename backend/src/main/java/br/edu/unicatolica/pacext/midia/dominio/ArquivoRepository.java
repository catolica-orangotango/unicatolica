package br.edu.unicatolica.pacext.midia.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

/** Repository do módulo Mídia — único ponto de acesso à tabela {@code arquivo} (AD-3). */
@ApplicationScoped
public class ArquivoRepository implements PanacheRepository<Arquivo> {
}
