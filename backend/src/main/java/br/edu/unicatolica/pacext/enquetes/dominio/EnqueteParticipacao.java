package br.edu.unicatolica.pacext.enquetes.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Entidade {@code enquete_participacao} — registra que o usuário votou (RF56.1), nunca em quem.
 * Não tem ligação com {@link EnqueteVoto} de propósito (RF57.1).
 */
@Entity
@Table(name = "enquete_participacao")
public class EnqueteParticipacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @Column(name = "enquete_id", nullable = false)
    public Long enqueteId;

    /** Id de {@code usuario} — sem relação JPA cruzando módulo (AD-3). */
    @Column(name = "usuario_id", nullable = false)
    public Long usuarioId;
}
