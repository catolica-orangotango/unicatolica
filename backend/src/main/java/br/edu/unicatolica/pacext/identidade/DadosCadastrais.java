package br.edu.unicatolica.pacext.identidade;

/**
 * Nome e curso do cadastro de um usuário, lidos e gravados pelo Perfil Acadêmico por
 * {@link UsuarioCadastro} (Story 4.1). {@code cursoId}/{@code cursoNome} são nulos para
 * conta antiga sem curso reconhecido na migração para a lista de cursos.
 * {@code fotoArquivoId} é o id do arquivo da foto de perfil (nulo sem foto), só por id (AD-3).
 */
public record DadosCadastrais(Long usuarioId, String nome, Long cursoId, String cursoNome,
        Long fotoArquivoId) {
}
