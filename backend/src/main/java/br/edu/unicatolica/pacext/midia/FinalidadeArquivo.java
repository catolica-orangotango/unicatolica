package br.edu.unicatolica.pacext.midia;

/**
 * Para que o arquivo foi enviado ({@code POST /arquivos}). Decide os formatos aceitos:
 * {@code ANEXO_POSTAGEM} aceita PDF, PNG e JPEG; {@code FOTO_PERFIL} só PNG e JPEG.
 */
public enum FinalidadeArquivo {
    ANEXO_POSTAGEM,
    FOTO_PERFIL
}
