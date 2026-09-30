package br.edu.unicatolica.pacext.identidade;

import java.util.Optional;

/**
 * Leitura e escrita de nome e curso do cadastro por outros módulos (API pública de
 * Identidade, AD-3) — usada pelo Perfil Acadêmico (Story 4.1, RF15/RF16). É o único
 * caminho por onde outro módulo altera {@code usuario}.
 */
public interface UsuarioCadastro {

    Optional<DadosCadastrais> buscar(Long usuarioId);

    /**
     * Grava nome e curso. {@code cursoId} precisa ser um curso ativo, a menos que seja o
     * curso que o usuário já tem (curso desativado continua no perfil de quem já o tem).
     * Trocar o curso dispara {@link CursoDoUsuarioAlterado} na mesma transação.
     *
     * @throws br.edu.unicatolica.pacext.compartilhado.erro.ApiException 422 {@code CURSO_INVALIDO}
     *     ou 404 {@code USUARIO_NAO_ENCONTRADO}
     */
    DadosCadastrais atualizarNomeECurso(Long usuarioId, String nome, Long cursoId);
}
