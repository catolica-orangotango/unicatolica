package br.edu.unicatolica.pacext.moderacao.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Entidade {@code restricao_usuario} (RF80). Ativa enquanto não foi revogada e
 * {@link #fimEm} é nulo (sem prazo) ou futuro.
 */
@Entity
@Table(name = "restricao_usuario")
public class RestricaoUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    /** Id de {@code usuario} — sem relação JPA cruzando módulo (AD-3). */
    @Column(name = "usuario_id", nullable = false)
    public Long usuarioId;

    /** Denúncia que originou a restrição, quando houver (mesmo módulo). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "denuncia_id")
    public Denuncia denuncia;

    @Column(name = "moderador_usuario_id", nullable = false)
    public Long moderadorUsuarioId;

    @Column(name = "motivo", nullable = false, columnDefinition = "TEXT")
    public String motivo;

    @Column(name = "inicio_em", nullable = false)
    public Instant inicioEm;

    @Column(name = "fim_em")
    public Instant fimEm;

    @Column(name = "revogada_em")
    public Instant revogadaEm;
}
