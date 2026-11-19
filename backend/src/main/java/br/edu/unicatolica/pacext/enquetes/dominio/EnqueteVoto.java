package br.edu.unicatolica.pacext.enquetes.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Entidade {@code enquete_voto} — uma opção escolhida, anônima (RF57.1).
 *
 * <p><b>Nunca</b> adicionar aqui campo de identidade, de data/hora ou de agrupamento por voto:
 * qualquer um deles permitiria cruzar com {@link EnqueteParticipacao} e revelar em quem cada pessoa
 * votou. O {@code EnqueteAnonimatoTest} falha se uma coluna dessas aparecer.</p>
 */
@Entity
@Table(name = "enquete_voto")
public class EnqueteVoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @Column(name = "opcao_id", nullable = false)
    public Long opcaoId;
}
