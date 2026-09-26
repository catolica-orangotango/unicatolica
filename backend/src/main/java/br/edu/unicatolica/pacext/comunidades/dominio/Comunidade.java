package br.edu.unicatolica.pacext.comunidades.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Entidade {@code comunidade} — módulo Comunidades. Nesta fatia, só é criada/consultada
 * como alvo do auto-join (Story 2.3); os fluxos de criação (Story 2.1/2.2) não fazem
 * parte desta implementação.
 */
@Entity
@Table(name = "comunidade")
public class Comunidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @Column(name = "nome", nullable = false, unique = true, length = 150)
    public String nome;

    @Column(name = "descricao", columnDefinition = "text")
    public String descricao;

    /** Imutável após a criação — sem setter de conveniência de propósito. */
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 10)
    public TipoComunidade tipo;

    /** Id de {@code usuario} — sem relação JPA cruzando módulo (AD-3). */
    @Column(name = "criado_por_usuario_id", nullable = false)
    public Long criadoPorUsuarioId;

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;

    @Column(name = "atualizado_em")
    public Instant atualizadoEm;
}
