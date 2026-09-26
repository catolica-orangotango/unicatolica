package br.edu.unicatolica.pacext.perfil.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Um interesse do aluno (RF18) — relação normal dentro do mesmo módulo (não cruza AD-3;
 * a regra de referência só-por-id vale entre módulos, não entre tabelas do mesmo dono).
 */
@Entity
@Table(name = "perfil_interesse")
public class Interesse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "perfil_id", nullable = false)
    public PerfilAcademico perfil;

    @Column(name = "texto", nullable = false, length = 60)
    public String texto;

    public Interesse() {
    }

    public Interesse(PerfilAcademico perfil, String texto) {
        this.perfil = perfil;
        this.texto = texto;
    }
}
