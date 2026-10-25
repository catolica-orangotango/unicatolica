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
 * Entidade {@code comunidade} — módulo Comunidades. Tipo {@code CURSO}: criada com o cadastro do
 * curso (Story 2.1) e alvo do auto-join (Story 2.3), sem botão "participar"; tipo {@code ABERTA}:
 * criada por qualquer aluno (Story 2.2).
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

    /**
     * Id do {@code curso} (Identidade) de uma comunidade de curso — sem FK nem relação JPA
     * (AD-3); {@code null} nas comunidades abertas. O auto-join casa por este id, então
     * renomear o curso não solta o vínculo (KAN-44).
     */
    @Column(name = "curso_id")
    public Long cursoId;

    /** Id de {@code usuario} — sem relação JPA cruzando módulo (AD-3). */
    @Column(name = "criado_por_usuario_id", nullable = false)
    public Long criadoPorUsuarioId;

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;

    @Column(name = "atualizado_em")
    public Instant atualizadoEm;

    /** Exclusão lógica (Story 2.6, RF31) — {@code false} some das listagens e bloqueia interações. */
    @Column(name = "ativa", nullable = false)
    public boolean ativa = true;
}
