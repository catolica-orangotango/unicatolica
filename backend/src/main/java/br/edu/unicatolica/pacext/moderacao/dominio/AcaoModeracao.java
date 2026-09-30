package br.edu.unicatolica.pacext.moderacao.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Entidade {@code acao_moderacao} — histórico de decisões sobre uma denúncia (RF78–RF80.1).
 * Não substitui o {@code log_auditoria}: o Service também grava lá pelo {@code AuditoriaService} (AD-11).
 */
@Entity
@Table(name = "acao_moderacao")
public class AcaoModeracao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    /** Mesmo módulo (moderacao) — relação JPA normal é permitida aqui (AD-3). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "denuncia_id", nullable = false)
    public Denuncia denuncia;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_acao", nullable = false, length = 30)
    public TipoAcaoModeracao tipoAcao;

    @Column(name = "moderador_usuario_id", nullable = false)
    public Long moderadorUsuarioId;

    /** Obrigatório em OCULTAR, REMOVER e RESTRINGIR_USUARIO (RF78.2, RF79.2) — CHECK no banco. */
    @Column(name = "motivo", columnDefinition = "TEXT")
    public String motivo;

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;
}
