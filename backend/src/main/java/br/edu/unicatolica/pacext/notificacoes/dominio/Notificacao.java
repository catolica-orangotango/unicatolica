package br.edu.unicatolica.pacext.notificacoes.dominio;

import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
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
 * Entidade {@code notificacao} — módulo Notificações. {@code usuarioId} é só o id, sem FK
 * nem relação JPA cruzando módulo (AD-3).
 */
@Entity
@Table(name = "notificacao")
public class Notificacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @Column(name = "usuario_id", nullable = false)
    public Long usuarioId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 50)
    public TipoNotificacao tipo;

    @Column(name = "texto", nullable = false, columnDefinition = "text")
    public String texto;

    @Column(name = "link")
    public String link;

    @Column(name = "lida", nullable = false)
    public boolean lida;

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;
}
