package br.edu.unicatolica.pacext.moderacao.dominio;

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
 * Entidade {@code denuncia} (RF75, RF76). Conteúdo e usuários são só ids, sem relação JPA
 * cruzando módulo (AD-3). {@link #denuncianteUsuarioId} existe só para barrar denúncia
 * duplicada: nenhuma resposta ao moderador pode expô-lo (RF77.1).
 */
@Entity
@Table(name = "denuncia")
public class Denuncia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_conteudo", nullable = false, length = 20)
    public TipoConteudo tipoConteudo;

    @Column(name = "conteudo_id", nullable = false)
    public Long conteudoId;

    @Column(name = "autor_conteudo_usuario_id", nullable = false)
    public Long autorConteudoUsuarioId;

    @Column(name = "denunciante_usuario_id", nullable = false)
    public Long denuncianteUsuarioId;

    @Column(name = "motivo", nullable = false, columnDefinition = "TEXT")
    public String motivo;

    @Enumerated(EnumType.STRING)
    @Column(name = "situacao", nullable = false, length = 20)
    public SituacaoDenuncia situacao = SituacaoDenuncia.PENDENTE;

    @Column(name = "moderador_original_usuario_id")
    public Long moderadorOriginalUsuarioId;

    @Column(name = "moderador_neutro_usuario_id")
    public Long moderadorNeutroUsuarioId;

    @Column(name = "escalonada_em")
    public Instant escalonadaEm;

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;

    @Column(name = "resolvida_em")
    public Instant resolvidaEm;
}
