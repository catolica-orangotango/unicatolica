package br.edu.unicatolica.pacext.identidade.aplicacao;

import br.edu.unicatolica.pacext.identidade.UsuarioCadastrado;
import br.edu.unicatolica.pacext.identidade.dominio.Curso;
import br.edu.unicatolica.pacext.identidade.dominio.GeradorTokenConfirmacao;
import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.email.EmailService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.regex.Pattern;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Regras de negócio da Story 1.2 (Cadastro de aluno com e-mail institucional). Cada
 * validação lança {@link ApiException} com o código/mensagem exigido pelo critério de
 * aceite correspondente — o {@code ApiExceptionMapper} traduz para o envelope AD-5.
 */
@ApplicationScoped
public class CadastroService {

    private static final int IDADE_MINIMA = 18;
    private static final Pattern SENHA_TEM_MAIUSCULA = Pattern.compile(".*[A-Z].*");
    private static final Pattern SENHA_TEM_DIGITO = Pattern.compile(".*\\d.*");
    private static final Pattern SENHA_TEM_ESPECIAL = Pattern.compile(".*[^A-Za-z0-9].*");

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    CursoService cursoService;

    @Inject
    PasswordHasher passwordHasher;

    @Inject
    GeradorTokenConfirmacao geradorTokenConfirmacao;

    @Inject
    Event<UsuarioCadastrado> usuarioCadastrado;

    @Inject
    EmailService emailService;

    @Inject
    AuditoriaService auditoriaService;

    /**
     * [DECISÃO A CONFIRMAR] domínio institucional exato não está definido em nenhum
     * artefato de planejamento — valor de exemplo, substituir via env var antes do deploy.
     */
    @ConfigProperty(name = "identidade.email.dominio-institucional")
    String dominioInstitucional;

    /** Política de senha (DT-2, KAN-50, decisão em docs/decisoes/2026-10-07-politica-de-senha.md). */
    @ConfigProperty(name = "identidade.senha.tamanho-minimo")
    int senhaTamanhoMinimo;

    @ConfigProperty(name = "identidade.confirmacao-email.token-validade-horas")
    long tokenValidadeHoras;

    @ConfigProperty(name = "app.frontend-url")
    String frontendUrl;

    @Transactional
    public Usuario cadastrar(String nome, String email, String senha, Long cursoId, LocalDate dataNascimento) {
        String emailNormalizado = email.trim().toLowerCase();

        validarDominioInstitucional(emailNormalizado);
        validarEmailDisponivel(emailNormalizado);
        validarPoliticaSenha(senha);
        validarIdadeMinima(dataNascimento);
        Curso curso = cursoService.buscarAtivoOuFalhar(cursoId);

        Usuario usuario = new Usuario();
        usuario.nome = nome.trim();
        usuario.email = emailNormalizado;
        usuario.senhaHash = passwordHasher.gerarHash(senha);
        usuario.dataNascimento = dataNascimento;
        usuario.cursoId = curso.id;
        usuario.curso = curso.nome;
        usuario.emailConfirmado = false;
        usuario.perfil = "ALUNO";
        usuario.criadoEm = Instant.now();
        usuario.tokenConfirmacaoEmail = geradorTokenConfirmacao.gerar();
        usuario.tokenConfirmacaoExpiraEm = Instant.now().plus(tokenValidadeHoras, ChronoUnit.HOURS);

        usuarioRepository.persist(usuario);

        // RF24.1 — Comunidades escuta e faz o auto-join na mesma transação. Nenhuma sessão é
        // gerada aqui (RF01.2).
        usuarioCadastrado.fire(new UsuarioCadastrado(usuario.id, usuario.curso));

        String linkConfirmacao = frontendUrl + "/confirmar-email?token=" + usuario.tokenConfirmacaoEmail;
        emailService.enviarConfirmacaoCadastro(usuario.email, usuario.nome, linkConfirmacao);

        auditoriaService.registrar(usuario.id, "identidade", "CADASTRO_REALIZADO", "Usuario", usuario.id, null);

        return usuario;
    }

    private void validarDominioInstitucional(String emailNormalizado) {
        String sufixo = "@" + dominioInstitucional.toLowerCase();
        if (!emailNormalizado.endsWith(sufixo)) {
            throw ApiException.validacao("EMAIL_DOMINIO_EXTERNO", "Use seu e-mail institucional para se cadastrar.",
                    null);
        }
    }

    private void validarEmailDisponivel(String emailNormalizado) {
        if (usuarioRepository.existePorEmail(emailNormalizado)) {
            throw ApiException.conflito("EMAIL_JA_CADASTRADO", "Esse e-mail já tem uma conta. Esqueceu a senha?",
                    null);
        }
    }

    private void validarPoliticaSenha(String senha) {
        boolean valida = senha != null
                && senha.length() >= senhaTamanhoMinimo
                && SENHA_TEM_MAIUSCULA.matcher(senha).matches()
                && SENHA_TEM_DIGITO.matcher(senha).matches()
                && SENHA_TEM_ESPECIAL.matcher(senha).matches();
        if (!valida) {
            throw ApiException.validacao("SENHA_POLITICA_INVALIDA", "A senha não atende aos requisitos mínimos.",
                    "Use pelo menos " + senhaTamanhoMinimo
                            + " caracteres, com letra maiúscula, número e caractere especial.");
        }
    }

    private void validarIdadeMinima(LocalDate dataNascimento) {
        int idade = Period.between(dataNascimento, LocalDate.now()).getYears();
        if (idade < IDADE_MINIMA) {
            throw ApiException.validacao("IDADE_MINIMA_NAO_ATENDIDA",
                    "Você precisa ter pelo menos 18 anos para se cadastrar.", null);
        }
    }
}
