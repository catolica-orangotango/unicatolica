package br.edu.unicatolica.pacext.identidade.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.Formula;

/**
 * Usuário do módulo Identidade e Acesso (RF05-RF13) — dono exclusivo da tabela
 * {@code usuario} (AD-3). Cadastro (Story 1.2) cria o registro; confirmação de e-mail
 * (Story 1.3) e login (Story 1.4) leem/atualizam os campos abaixo.
 */
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;

    @Column(name = "nome", nullable = false, length = 200)
    public String nome;

    @Column(name = "email", nullable = false, unique = true, length = 200)
    public String email;

    @Column(name = "senha_hash", nullable = false, length = 100)
    public String senhaHash;

    /** Perfil global do usuário (RF13), ex.: "ALUNO", "MODERADOR", "ADMINISTRADOR" (ver {@code Perfis}). */
    @Column(name = "perfil", nullable = false, length = 30)
    public String perfil;

    /** Login só é permitido com e-mail confirmado (Story 1.3, RF06). */
    @Column(name = "email_confirmado", nullable = false)
    public boolean emailConfirmado;

    /** Id de {@code curso} (mesmo módulo) — fonte de verdade do curso do aluno desde {@code identidade-005}. */
    @Column(name = "curso_id")
    public Long cursoId;

    /**
     * Nome atual do curso de {@link #cursoId}, lido do banco junto com o usuário (só leitura:
     * a cópia em texto saiu na {@code identidade-010}, então renomear o curso vale para todos).
     * A fórmula só é calculada ao carregar; depois de mudar {@link #cursoId} na mesma
     * transação, quem muda atribui este campo à mão.
     */
    @Formula("(select c.nome from curso c where c.id = curso_id)")
    public String cursoNome;

    /** Usado para validar idade mínima no cadastro (Story 1.2, RF01.1). */
    @Column(name = "data_nascimento")
    public LocalDate dataNascimento;

    @Column(name = "token_confirmacao_email", length = 255)
    public String tokenConfirmacaoEmail;

    @Column(name = "token_confirmacao_expira_em")
    public Instant tokenConfirmacaoExpiraEm;

    /**
     * Logout (Story 1.6, RF10/RF11) — instante a partir do qual tokens são aceitos.
     * {@code null} significa sem restrição. Atualizado para "agora" a cada logout;
     * JwtSecurityFilter rejeita tokens com {@code iat} anterior a este valor.
     */
    @Column(name = "sessao_valida_desde")
    public Instant sessaoValidaDesde;

    /**
     * Quantas vezes este usuário já fez login (Story 4.3, RF20.1) — incrementado em
     * {@code AuthService.autenticar}. Único consumidor hoje é o gatilho da notificação de
     * onboarding progressivo, que dispara a partir do 2º login.
     */
    @Column(name = "total_logins", nullable = false)
    public int totalLogins;

    @Column(name = "criado_em", nullable = false)
    public Instant criadoEm;

    @Column(name = "atualizado_em")
    public Instant atualizadoEm;
}
