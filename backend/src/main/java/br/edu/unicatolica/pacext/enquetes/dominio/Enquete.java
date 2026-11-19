package br.edu.unicatolica.pacext.enquetes.dominio;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.BatchSize;

/** Entidade {@code enquete} — pergunta de um membro numa comunidade (RF53.1, RF54). */
@Entity
@Table(name = "enquete")
public class Enquete {

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

    @Column(name = "pergunta", nullable = false, length = 300)
    public String pergunta;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 10)
    public TipoEnquete tipo;

    /** Só em enquete de escolha múltipla (RF54.2); nulo em escolha única. */
    @Column(name = "limite_selecao")
    public Integer limiteSelecao;

    @Enumerated(EnumType.STRING)
    @Column(name = "situacao", nullable = false, length = 20)
    public SituacaoEnquete situacao = SituacaoEnquete.ATIVA;

    @Column(name = "criada_em", nullable = false)
    public Instant criadaEm;

    /** No máximo 5 itens: carregada junto, em lote, para a página não gerar uma consulta por enquete. */
    @OneToMany(mappedBy = "enquete", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("posicao")
    @BatchSize(size = 50)
    public List<EnqueteOpcao> opcoes = new ArrayList<>();
}
