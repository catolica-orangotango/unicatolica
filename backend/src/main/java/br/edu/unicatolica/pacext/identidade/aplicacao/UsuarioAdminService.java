package br.edu.unicatolica.pacext.identidade.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.Perfis;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Gestão de usuários pelo administrador da plataforma (KAN-83): listar, alterar o perfil e
 * desativar ou reativar a conta. Só perfil {@code ADMINISTRADOR}; as duas alterações derrubam
 * a sessão do usuário afetado e ficam na auditoria (AD-11).
 *
 * <p>Regras: o administrador não altera o próprio perfil nem a própria conta, e o sistema
 * nunca fica sem administrador ativo (409 nos dois casos).</p>
 */
@ApplicationScoped
public class UsuarioAdminService {

    private static final int TAMANHO_MAXIMO = 100;

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    AuditoriaService auditoriaService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /**
     * @param busca  trecho do nome ou do e-mail; em branco vale como sem filtro
     * @param perfil perfil exato; em branco vale como sem filtro
     */
    public PageResponse<Usuario> listar(String busca, String perfil, int pagina, int tamanho) {
        usuarioAutenticado.exigirAdministrador();
        String buscaNormalizada = emBrancoParaNulo(busca);
        String perfilNormalizado = emBrancoParaNulo(perfil);
        if (perfilNormalizado != null) {
            exigirPerfilValido(perfilNormalizado);
        }
        int paginaSegura = Math.max(pagina, 0);
        int tamanhoSeguro = Math.min(Math.max(tamanho, 1), TAMANHO_MAXIMO);

        List<Usuario> conteudo = usuarioRepository.listarParaAdmin(buscaNormalizada, perfilNormalizado,
                paginaSegura, tamanhoSeguro);
        long total = usuarioRepository.contarParaAdmin(buscaNormalizada, perfilNormalizado);
        return PageResponse.de(conteudo, paginaSegura, tamanhoSeguro, total);
    }

    /** Mesmo perfil que o atual não muda nada: sem auditoria e sem derrubar a sessão. */
    @Transactional
    public Usuario alterarPerfil(Long usuarioId, String perfil) {
        usuarioAutenticado.exigirAdministrador();
        exigirPerfilValido(perfil);
        Usuario alvo = buscarOuFalhar(usuarioId);
        exigirOutroUsuario(alvo);
        if (perfil.equals(alvo.perfil)) {
            return alvo;
        }
        if (Perfis.ADMINISTRADOR.equals(alvo.perfil)) {
            exigirOutroAdministradorAtivo(alvo);
        }

        String anterior = alvo.perfil;
        alvo.perfil = perfil;
        derrubarSessao(alvo);
        auditoriaService.registrar(usuarioAutenticado.id(), "identidade", "PERFIL_ALTERADO", "Usuario", alvo.id,
                anterior + " -> " + perfil);
        return alvo;
    }

    /** Mesma situação que a atual não muda nada: sem auditoria e sem derrubar a sessão. */
    @Transactional
    public Usuario alterarSituacao(Long usuarioId, boolean ativo) {
        usuarioAutenticado.exigirAdministrador();
        Usuario alvo = buscarOuFalhar(usuarioId);
        exigirOutroUsuario(alvo);
        if (ativo == alvo.ativo) {
            return alvo;
        }
        if (!ativo && Perfis.ADMINISTRADOR.equals(alvo.perfil)) {
            exigirOutroAdministradorAtivo(alvo);
        }

        boolean anterior = alvo.ativo;
        alvo.ativo = ativo;
        if (!ativo) {
            derrubarSessao(alvo);
        }
        auditoriaService.registrar(usuarioAutenticado.id(), "identidade",
                ativo ? "CONTA_REATIVADA" : "CONTA_DESATIVADA", "Usuario", alvo.id,
                "ativo: " + anterior + " -> " + ativo);
        return alvo;
    }

    private Usuario buscarOuFalhar(Long usuarioId) {
        return usuarioRepository.findByIdOptional(usuarioId)
                .orElseThrow(() -> ApiException.naoEncontrado("USUARIO_NAO_ENCONTRADO",
                        "Usuário não encontrado.", null));
    }

    private void exigirPerfilValido(String perfil) {
        if (!Perfis.ehValido(perfil)) {
            throw ApiException.validacao("PERFIL_INVALIDO",
                    "Perfil inválido. Use ALUNO, MODERADOR ou ADMINISTRADOR.", "perfil");
        }
    }

    private void exigirOutroUsuario(Usuario alvo) {
        if (alvo.id.equals(usuarioAutenticado.id())) {
            throw ApiException.conflito("AUTO_ALTERACAO_NAO_PERMITIDA",
                    "Você não pode alterar o próprio perfil nem a própria conta. Peça a outro administrador.", null);
        }
    }

    /** O alvo é administrador: só pode deixar de ser (ou de estar ativo) se sobrar outro ativo. */
    private void exigirOutroAdministradorAtivo(Usuario alvo) {
        if (usuarioRepository.contarAdministradoresAtivosExceto(alvo.id) == 0) {
            throw ApiException.conflito("ULTIMO_ADMINISTRADOR",
                    "A plataforma precisa de pelo menos um administrador ativo.", null);
        }
    }

    /** Mesmo mecanismo do logout: tokens emitidos até agora deixam de valer (SessaoInvalidadaFilter). */
    private void derrubarSessao(Usuario usuario) {
        usuario.sessaoValidaDesde = Instant.now().truncatedTo(ChronoUnit.SECONDS);
    }

    private String emBrancoParaNulo(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
