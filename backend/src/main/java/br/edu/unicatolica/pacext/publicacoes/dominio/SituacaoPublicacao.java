package br.edu.unicatolica.pacext.publicacoes.dominio;

/** Situação da postagem — alterada só pela Moderação, via {@code PublicacaoModeracao} (Story 12.5). */
public enum SituacaoPublicacao {
    /** Aparece no feed. */
    VISIVEL,
    /** Ocultada por moderador (RF78): fora do feed, preservada e restaurável (RF78.1). */
    OCULTA
}
