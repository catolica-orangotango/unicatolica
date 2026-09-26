package br.edu.unicatolica.pacext.identidade.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.seguranca.SessaoConsulta;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.identidade.UsuarioAtualizacao;
import br.edu.unicatolica.pacext.identidade.UsuarioConsulta;
import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.identidade.dominio.AcessoNegadoException;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Leitura de usuários (Story 1.5, RF12/RF13): atende o {@code UsuarioResource} e é a
 * implementação das duas interfaces que expõem {@code usuario} para fora do módulo —
 * {@link UsuarioConsulta} (outros módulos), {@link SessaoConsulta} (filtro de logout) e
 * {@link UsuarioAtualizacao} (escrita de nome/curso por outro módulo, Epic 4).
 */
@ApplicationScoped
public class UsuarioService implements UsuarioConsulta, SessaoConsulta, UsuarioAtualizacao {

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /** Qualquer perfil autenticado pode ver o próprio perfil. */
    public Usuario buscarProprio() {
        return buscar(usuarioAutenticado.id());
    }

    /**
     * Somente perfil {@code MODERADOR} pode ver o perfil de outro usuário. Recusa com
     * {@link AcessoNegadoException} (403): a existência do usuário não precisa ficar
     * oculta (AD-5).
     */
    public Usuario buscarPorId(Long id) {
        if (!usuarioAutenticado.possuiPerfil("MODERADOR")) {
            throw new AcessoNegadoException();
        }
        return buscar(id);
    }

    @Override
    public Map<Long, UsuarioResumo> buscarResumos(Collection<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return usuarioRepository.buscarPorIds(ids).stream()
                .map(u -> new UsuarioResumo(u.id, u.nome, u.curso))
                .collect(Collectors.toMap(UsuarioResumo::id, Function.identity()));
    }

    /** RF15/RF16 — chamado pelo módulo Perfil Acadêmico via {@link UsuarioAtualizacao}. */
    @Override
    @Transactional
    public void atualizarNomeECurso(Long usuarioId, String nome, String curso) {
        Usuario usuario = buscar(usuarioId);
        usuario.nome = nome;
        usuario.curso = curso;
        usuario.atualizadoEm = Instant.now();
    }

    @Override
    public Optional<Instant> sessaoValidaDesde(Long usuarioId) {
        return Optional.ofNullable(usuarioRepository.findById(usuarioId)).map(u -> u.sessaoValidaDesde);
    }

    private Usuario buscar(Long id) {
        Usuario usuario = usuarioRepository.findById(id);
        if (usuario == null) {
            throw ApiException.naoEncontrado("RECURSO_NAO_ENCONTRADO", "Usuário não encontrado.", null);
        }
        return usuario;
    }
}
