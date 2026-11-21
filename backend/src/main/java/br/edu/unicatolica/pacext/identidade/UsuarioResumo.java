package br.edu.unicatolica.pacext.identidade;

/**
 * Dados de um usuário que outros módulos podem exibir (ex.: autor de uma publicação).
 * {@code fotoArquivoId} é só o id do arquivo da foto de perfil (nulo sem foto); quem exibe
 * resolve a URL por {@code midia.MidiaConsulta}.
 */
public record UsuarioResumo(Long id, String nome, String curso, Long fotoArquivoId) {
}
