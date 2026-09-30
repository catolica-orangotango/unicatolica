package br.edu.unicatolica.pacext.publicacoes.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Entidade {@code publicacao} — postagem de um usuário em uma comunidade (RF32, RF34, RF35). */
@Entity
@Table(name = "publicacao")
public class Publicacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    /** Id de {@code comunidade} — sem relação JPA cruzando módulo (AD-3). */
    @Column(name = "comunidade_id", nullable = false)
    public Long comunidadeId;

    /** Id de {@code usuario} — sem relação JPA cruzando módulo (AD-3). */
    @Column(name = "autor_usuario_id", nullable = false)
    public Long autorUsuarioId;

    @Column(name = "conteudo", nullable = false, columnDefinition = "TEXT")
    public String conteudo;

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;

    @Column(name = "atualizado_em")
    public Instant atualizadoEm;
}
