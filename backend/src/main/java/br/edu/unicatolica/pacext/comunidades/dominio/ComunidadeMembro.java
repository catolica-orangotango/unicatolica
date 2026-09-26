package br.edu.unicatolica.pacext.comunidades.dominio;

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
 * Entidade {@code comunidade_membro} — associação usuário/comunidade (RF24, RF25). O
 * único mecanismo de idempotência para o auto-join (RF24.1) é a checagem em
 * {@code AutoJoinCursoServiceImpl}; a constraint única de banco (comunidade_id, usuario_id)
 * é a rede de segurança contra ingresso duplicado (RF25).
 */
@Entity
@Table(name = "comunidade_membro")
public class ComunidadeMembro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    /** Mesma módulo (comunidades) — relação JPA normal é permitida aqui (AD-3). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comunidade_id", nullable = false)
    public Comunidade comunidade;

    /** Id de {@code usuario} — sem relação JPA cruzando módulo (AD-3). */
    @Column(name = "usuario_id", nullable = false)
    public Long usuarioId;

    @Enumerated(EnumType.STRING)
    @Column(name = "papel_na_comunidade", nullable = false, length = 20)
    public PapelMembro papelNaComunidade = PapelMembro.MEMBRO;

    @Column(name = "entrou_em", nullable = false)
    public Instant entrouEm;
}
