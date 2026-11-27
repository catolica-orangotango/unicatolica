package br.edu.unicatolica.pacext.avisos.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/** Entidade {@code aviso} — comunicado institucional publicado pelo administrador (RF81). */
@Entity
@Table(name = "aviso")
public class Aviso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @Column(name = "titulo", nullable = false, length = 120)
    public String titulo;

    @Column(name = "mensagem", nullable = false, columnDefinition = "TEXT")
    public String mensagem;

    @Enumerated(EnumType.STRING)
    @Column(name = "escopo", nullable = false, length = 10)
    public EscopoAviso escopo;

    /** Id de {@code curso} (módulo identidade) — só no escopo CURSO, sem FK nem relação JPA (AD-3). */
    @Column(name = "curso_id")
    public Long cursoId;

    /** Dia a que o aviso se refere; opcional. */
    @Column(name = "data_destaque")
    public LocalDate dataDestaque;

    /** Id de {@code usuario} — o administrador que publicou, sem FK nem relação JPA (AD-3). */
    @Column(name = "autor_usuario_id", nullable = false)
    public Long autorUsuarioId;

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;
}
