package br.edu.unicatolica.pacext.enquetes.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Entidade {@code enquete_opcao} — uma das 2 a 5 opções de uma enquete (RF54.3). */
@Entity
@Table(name = "enquete_opcao")
public class EnqueteOpcao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enquete_id", nullable = false)
    public Enquete enquete;

    @Column(name = "texto", nullable = false, length = 100)
    public String texto;

    /** Ordem de exibição, a partir de 0 — a ordem em que o autor digitou. */
    @Column(name = "posicao", nullable = false)
    public int posicao;
}
