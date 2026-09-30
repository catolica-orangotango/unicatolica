package br.edu.unicatolica.pacext.identidade.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Entidade {@code curso} — curso da instituição (RF16). Cadastrado por administrador
 * (KAN-44); a lista inicial vem da migration {@code identidade-005}. O nome casa com a
 * comunidade de curso no auto-join (RF24.1).
 */
@Entity
@Table(name = "curso")
public class Curso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @Column(name = "nome", nullable = false, length = 150)
    public String nome;

    /** Curso inativo some da lista do cadastro, mas continua no perfil de quem já o tem. */
    @Column(name = "ativo", nullable = false)
    public boolean ativo = true;

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;
}
