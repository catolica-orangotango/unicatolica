package br.edu.unicatolica.pacext.identidade.dominio;

import br.edu.unicatolica.pacext.compartilhado.seguranca.Perfis;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Repositório próprio do módulo Identidade — nenhum outro módulo acessa {@code usuario} diretamente (AD-3). */
@ApplicationScoped
public class UsuarioRepository implements PanacheRepository<Usuario> {

    public Optional<Usuario> buscarPorEmail(String email) {
        return find("email", email).firstResultOptional();
    }

    /** Cadastro (Story 1.2, RF02) normaliza e-mail para minúsculas antes de gravar/consultar. */
    public boolean existePorEmail(String email) {
        return count("email", email) > 0;
    }

    /** Confirmação de e-mail (Story 1.3) — lookup pelo token de uso único do link. */
    public Optional<Usuario> buscarPorTokenConfirmacao(String token) {
        return find("tokenConfirmacaoEmail", token).firstResultOptional();
    }

    /**
     * Tela "Usuários" do administrador (KAN-83), por nome. {@code busca} casa por trecho do
     * nome ou do e-mail, sem diferenciar maiúsculas; {@code perfil} filtra pelo perfil exato.
     * Os dois são opcionais ({@code null} = sem filtro).
     */
    public List<Usuario> listarParaAdmin(String busca, String perfil, int pagina, int tamanho) {
        return montarQueryAdmin(busca, perfil).page(Page.of(pagina, tamanho)).list();
    }

    public long contarParaAdmin(String busca, String perfil) {
        return montarQueryAdmin(busca, perfil).count();
    }

    /** Quantos administradores ativos existem fora {@code usuarioId}: o sistema nunca fica sem nenhum (KAN-83). */
    public long contarAdministradoresAtivosExceto(Long usuarioId) {
        return count("perfil = ?1 and ativo = true and id <> ?2", Perfis.ADMINISTRADOR, usuarioId);
    }

    private PanacheQuery<Usuario> montarQueryAdmin(String busca, String perfil) {
        StringBuilder consulta = new StringBuilder("1 = 1");
        List<Object> parametros = new ArrayList<>();
        if (busca != null) {
            parametros.add("%" + busca.toLowerCase() + "%");
            consulta.append(" and (lower(nome) like ?").append(parametros.size())
                    .append(" or lower(email) like ?").append(parametros.size()).append(")");
        }
        if (perfil != null) {
            parametros.add(perfil);
            consulta.append(" and perfil = ?").append(parametros.size());
        }
        consulta.append(" order by lower(nome), id");
        return find(consulta.toString(), parametros.toArray());
    }

    /** Consulta em lote para {@code UsuarioConsulta.buscarResumos}. */
    public List<Usuario> buscarPorIds(Collection<Long> ids) {
        return list("id in ?1", ids);
    }
}
