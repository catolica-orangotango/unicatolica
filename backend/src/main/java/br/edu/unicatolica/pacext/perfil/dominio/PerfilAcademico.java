package br.edu.unicatolica.pacext.perfil.dominio;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Entidade {@code perfil_academico} — período e interesses do aluno (RF14, RF17, RF18).
 * Nome e curso não ficam aqui: são de {@code usuario}, no módulo Identidade (AD-3).
 */
@Entity
@Table(name = "perfil_academico")
public class PerfilAcademico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    /** Id de {@code usuario} — sem relação JPA cruzando módulo (AD-3). Um perfil por usuário. */
    @Column(name = "usuario_id", nullable = false, unique = true)
    public Long usuarioId;

    @Column(name = "periodo", nullable = false)
    public Short periodo;

    /** Interesses (RF18) — tabela {@code perfil_interesse}, mesmo módulo. Vazio dispara o onboarding (RF20.1). */
    @ElementCollection
    @CollectionTable(name = "perfil_interesse", joinColumns = @JoinColumn(name = "perfil_academico_id"))
    @Column(name = "interesse", nullable = false, length = 50)
    public Set<String> interesses = new LinkedHashSet<>();

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;

    @Column(name = "atualizado_em")
    public Instant atualizadoEm;
}
