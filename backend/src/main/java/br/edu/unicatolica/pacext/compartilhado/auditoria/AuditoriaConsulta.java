package br.edu.unicatolica.pacext.compartilhado.auditoria;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Leitura da trilha de auditoria (KAN-90), somente leitura: a escrita continua só em
 * {@link AuditoriaService} (AD-11). Consumida pela administração de plataforma; nenhum módulo
 * lê {@code log_auditoria} direto. Consultar não gera registro de auditoria.
 */
public interface AuditoriaConsulta {

    /**
     * Filtros combinados com E; {@code null} é "sem filtro".
     *
     * @param modulo          igualdade
     * @param acao            igualdade
     * @param entidadeAfetada igualdade
     * @param detalhes        contém, sem diferenciar maiúsculas (o chamador garante o mínimo de caracteres)
     * @param de              limite inferior, inclusivo
     * @param ateExclusivo    limite superior, exclusivo
     */
    record Filtro(String modulo, String acao, String entidadeAfetada, String detalhes, Instant de,
            Instant ateExclusivo) {
    }

    /** Valores que existem hoje na tabela, para as listas de seleção da tela. */
    record Opcoes(List<String> modulos, Map<String, List<String>> acoesPorModulo, List<String> entidadesAfetadas) {
    }

    /** Mais recentes primeiro ({@code criado_em} e {@code id} decrescentes). */
    PageResponse<LogAuditoria> buscar(Filtro filtro, int pagina, int tamanho);

    Opcoes opcoes();
}
