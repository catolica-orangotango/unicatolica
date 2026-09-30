package br.edu.unicatolica.pacext.identidade.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.identidade.CursoDoUsuarioAlterado;
import br.edu.unicatolica.pacext.identidade.DadosCadastrais;
import br.edu.unicatolica.pacext.identidade.UsuarioCadastro;
import br.edu.unicatolica.pacext.identidade.dominio.Curso;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/** Implementação package-private — só é alcançável via {@link UsuarioCadastro} (AD-3). */
@ApplicationScoped
class UsuarioCadastroImpl implements UsuarioCadastro {

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    CursoService cursoService;

    @Inject
    Event<CursoDoUsuarioAlterado> cursoDoUsuarioAlterado;

    @Override
    public Optional<DadosCadastrais> buscar(Long usuarioId) {
        return usuarioRepository.findByIdOptional(usuarioId).map(UsuarioCadastroImpl::dados);
    }

    @Override
    @Transactional
    public DadosCadastrais atualizarNomeECurso(Long usuarioId, String nome, Long cursoId) {
        Usuario usuario = usuarioRepository.findByIdOptional(usuarioId)
                .orElseThrow(() -> ApiException.naoEncontrado("USUARIO_NAO_ENCONTRADO", "Usuário não encontrado.", null));
        if (nome == null || nome.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Informe seu nome.", "nome");
        }

        usuario.nome = nome.strip();
        if (!Objects.equals(usuario.cursoId, cursoId)) {
            Curso curso = cursoService.buscarAtivoOuFalhar(cursoId);
            String cursoAnterior = usuario.cursoId == null ? null : usuario.curso;
            usuario.cursoId = curso.id;
            usuario.curso = curso.nome;
            cursoDoUsuarioAlterado.fire(new CursoDoUsuarioAlterado(usuario.id, cursoAnterior, curso.nome));
        }
        usuario.atualizadoEm = Instant.now();
        return dados(usuario);
    }

    private static DadosCadastrais dados(Usuario usuario) {
        return new DadosCadastrais(usuario.id, usuario.nome, usuario.cursoId,
                usuario.cursoId == null ? null : usuario.curso);
    }
}
