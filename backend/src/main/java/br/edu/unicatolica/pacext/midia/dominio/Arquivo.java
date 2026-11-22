package br.edu.unicatolica.pacext.midia.dominio;

import br.edu.unicatolica.pacext.midia.FinalidadeArquivo;
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
 * Entidade {@code arquivo} — metadados de um objeto guardado no bucket (RF48–RF51). Os bytes
 * ficam só no armazenamento de objetos, na {@link #chave}; aqui ficam tipo, tamanho e dono.
 */
@Entity
@Table(name = "arquivo")
public class Arquivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    /** Caminho do objeto no bucket ({@code arquivos/<uuid>}); nunca leva o nome original. */
    @Column(name = "chave", nullable = false, unique = true, length = 100)
    public String chave;

    /** Tipo MIME detectado pelo conteúdo, nunca o declarado pelo cliente. */
    @Column(name = "tipo_conteudo", nullable = false, length = 50)
    public String tipoConteudo;

    @Column(name = "tamanho_bytes", nullable = false)
    public long tamanhoBytes;

    @Column(name = "nome_original", nullable = false, length = 255)
    public String nomeOriginal;

    /** Id do {@code usuario} que enviou — sem relação JPA cruzando módulo (AD-3). */
    @Column(name = "dono_id", nullable = false)
    public Long donoId;

    @Enumerated(EnumType.STRING)
    @Column(name = "finalidade", nullable = false, length = 20)
    public FinalidadeArquivo finalidade;

    /** Já vinculado a uma postagem ou a um perfil: um arquivo serve a um uso só. */
    @Column(name = "em_uso", nullable = false)
    public boolean emUso;

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;
}
