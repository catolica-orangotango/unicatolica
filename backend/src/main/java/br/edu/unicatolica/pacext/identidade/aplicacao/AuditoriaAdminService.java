package br.edu.unicatolica.pacext.identidade.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaConsulta;
import br.edu.unicatolica.pacext.compartilhado.auditoria.LogAuditoria;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Consulta de logs de auditoria pelo administrador (KAN-90, RF83). Só perfil
 * {@code ADMINISTRADOR}; somente leitura e a consulta não gera log (RN11). Completa o autor com
 * nome e e-mail, que o {@code compartilhado/} não pode ler (AD-3).
 */
@ApplicationScoped
public class AuditoriaAdminService {

    static final int TAMANHO_MAXIMO = 20;
    static final int DETALHES_MINIMO = 3;
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    @Inject
    AuditoriaConsulta auditoriaConsulta;

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /** Registro com o autor já resolvido; {@code autor} é nulo se o usuário não existe mais. */
    public record RegistroComAutor(LogAuditoria log, Usuario autor) {
    }

    /**
     * Filtros vazios (ou só espaços) valem como sem filtro; {@code detalhes} com menos de 3
     * caracteres é ignorado (RN07).
     */
    public PageResponse<RegistroComAutor> listar(String modulo, String acao, String entidadeAfetada,
            String detalhes, LocalDate de, LocalDate ate, int pagina, int tamanho) {
        usuarioAutenticado.exigirAdministrador();
        if (de != null && ate != null && de.isAfter(ate)) {
            throw ApiException.validacao("INTERVALO_DE_DATAS_INVALIDO",
                    "A data inicial não pode ser depois da data final.", "de");
        }
        String detalhesNormalizado = emBrancoParaNulo(detalhes);
        if (detalhesNormalizado != null && detalhesNormalizado.length() < DETALHES_MINIMO) {
            detalhesNormalizado = null;
        }
        int paginaSegura = Math.max(pagina, 0);
        int tamanhoSeguro = Math.min(Math.max(tamanho, 1), TAMANHO_MAXIMO);

        AuditoriaConsulta.Filtro filtro = new AuditoriaConsulta.Filtro(emBrancoParaNulo(modulo),
                emBrancoParaNulo(acao), emBrancoParaNulo(entidadeAfetada), detalhesNormalizado,
                de == null ? null : de.atStartOfDay(FUSO).toInstant(),
                ate == null ? null : ate.plusDays(1).atStartOfDay(FUSO).toInstant());

        PageResponse<LogAuditoria> resultado = auditoriaConsulta.buscar(filtro, paginaSegura, tamanhoSeguro);
        Map<Long, Usuario> autores = buscarAutores(resultado.content());
        List<RegistroComAutor> conteudo = resultado.content().stream()
                .map(log -> new RegistroComAutor(log, log.usuarioId == null ? null : autores.get(log.usuarioId)))
                .toList();
        return new PageResponse<>(conteudo, resultado.page(), resultado.size(), resultado.totalElements(),
                resultado.totalPages());
    }

    public AuditoriaConsulta.Opcoes filtros() {
        usuarioAutenticado.exigirAdministrador();
        return auditoriaConsulta.opcoes();
    }

    private Map<Long, Usuario> buscarAutores(List<LogAuditoria> logs) {
        Set<Long> ids = new HashSet<>();
        logs.forEach(log -> {
            if (log.usuarioId != null) {
                ids.add(log.usuarioId);
            }
        });
        if (ids.isEmpty()) {
            return Map.of();
        }
        return usuarioRepository.list("id in ?1", ids).stream()
                .collect(Collectors.toMap(u -> u.id, Function.identity()));
    }

    private String emBrancoParaNulo(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
