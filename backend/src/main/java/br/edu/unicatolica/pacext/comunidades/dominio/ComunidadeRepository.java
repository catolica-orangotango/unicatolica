package br.edu.unicatolica.pacext.comunidades.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;

/** Repository do módulo Comunidades — único ponto de acesso à tabela {@code comunidade} (AD-3). */
@ApplicationScoped
public class ComunidadeRepository implements PanacheRepository<Comunidade> {

    /** Busca case-insensitive — o texto de curso vem digitado livremente no cadastro (Story 1.2). */
    public Optional<Comunidade> buscarPorTipoENome(TipoComunidade tipo, String nome) {
        return find("tipo = ?1 and lower(nome) = ?2", tipo, nome.toLowerCase()).firstResultOptional();
    }

    public boolean existePorNome(String nome) {
        return count("lower(nome) = ?1", nome.trim().toLowerCase()) > 0;
    }

    /**
     * Listagem/filtro (Story 2.5, RF27/RF28) — {@code tipo}/{@code nome} nulos significam
     * "sem filtro por esse campo". Protótipo desta fatia: filtro simples por igualdade de
     * tipo e "contém" (case-insensitive) de nome; refinar depois se o time precisar de
     * filtros combinados mais ricos.
     */
    public List<Comunidade> listar(TipoComunidade tipo, String nome, int pagina, int tamanho) {
        return montarQuery(tipo, nome).page(Page.of(pagina, tamanho)).list();
    }

    public long contar(TipoComunidade tipo, String nome) {
        return montarQuery(tipo, nome).count();
    }

    private io.quarkus.hibernate.orm.panache.PanacheQuery<Comunidade> montarQuery(TipoComunidade tipo, String nome) {
        boolean temTipo = tipo != null;
        boolean temNome = nome != null && !nome.isBlank();
        String nomeFiltro = temNome ? "%" + nome.trim().toLowerCase() + "%" : null;

        if (temTipo && temNome) {
            return find("tipo = ?1 and lower(nome) like ?2 order by nome", tipo, nomeFiltro);
        }
        if (temTipo) {
            return find("tipo = ?1 order by nome", tipo);
        }
        if (temNome) {
            return find("lower(nome) like ?1 order by nome", nomeFiltro);
        }
        return findAll(io.quarkus.panache.common.Sort.by("nome"));
    }
}
