package br.edu.unicatolica.pacext.perfil.dominio;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidade {@code perfil_academico} — módulo Perfil Acadêmico. Guarda só {@code periodo}
 * e {@code interesses} (RF17/RF18): nome e curso continuam só em
 * {@code identidade.Usuario}, lidos/gravados pelas APIs públicas de Identidade (ver
 * {@code package-info.java} deste módulo). {@code usuarioId} é referência só por id, sem
 * FK/relação JPA cruzando módulo (AD-3).
 */
@Entity
@Table(name = "perfil_academico")
public class PerfilAcademico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @Column(name = "usuario_id", nullable = false, unique = true)
    public Long usuarioId;

    /** Período/semestre atual do curso (RF17) — opcional, nem todo aluno preenche logo. */
    @Column(name = "periodo")
    public Integer periodo;

    /**
     * Interesses (RF18) — lista simples de textos curtos, sem tabela própria de valores
     * (protótipo desta fatia). {@code orphanRemoval} + {@code CascadeType.ALL}: o filho só
     * existe através do pai, então {@link br.edu.unicatolica.pacext.perfil.aplicacao.PerfilService}
     * pode simplesmente limpar e recriar a lista inteira a cada edição (RF18) sem se
     * preocupar em orfanizar linha nenhuma. Ordenado por {@code id} (não
     * {@code @OrderColumn}: numa associação {@code mappedBy}, o Hibernate só preenche a
     * coluna de ordem numa 2ª volta de UPDATE, que falha contra uma coluna NOT NULL no
     * INSERT inicial) — como a lista é sempre substituída por inteiro a cada edição, a
     * ordem de criação dos ids já é a ordem de inserção do aluno.
     */
    @OneToMany(mappedBy = "perfil", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    public List<Interesse> interesses = new ArrayList<>();

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;

    @Column(name = "atualizado_em")
    public Instant atualizadoEm;
}
