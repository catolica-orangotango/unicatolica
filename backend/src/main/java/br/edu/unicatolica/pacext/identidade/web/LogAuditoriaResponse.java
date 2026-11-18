package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.compartilhado.auditoria.LogAuditoria;
import br.edu.unicatolica.pacext.identidade.aplicacao.AuditoriaAdminService.RegistroComAutor;
import java.time.Instant;

/** Item de {@code GET /admin/auditoria} (KAN-90); {@code autor} nulo é evento do sistema. */
public record LogAuditoriaResponse(Long id, Instant criadoEm, AutorAuditoriaResponse autor, String modulo,
        String acao, String entidadeAfetada, Long entidadeId, String detalhes) {

    public static LogAuditoriaResponse de(RegistroComAutor registro) {
        LogAuditoria log = registro.log();
        AutorAuditoriaResponse autor = null;
        if (log.usuarioId != null) {
            autor = registro.autor() == null
                    ? new AutorAuditoriaResponse(log.usuarioId, null, null)
                    : new AutorAuditoriaResponse(log.usuarioId, registro.autor().nome, registro.autor().email);
        }
        return new LogAuditoriaResponse(log.id, log.criadoEm, autor, log.modulo, log.acao, log.entidadeAfetada,
                log.entidadeId, log.detalhes);
    }
}
