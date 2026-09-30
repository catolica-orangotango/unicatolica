package br.edu.unicatolica.pacext.moderacao.dominio;

/** Tipo do conteúdo denunciado (RF75) — o id aponta para a tabela do módulo dono (AD-3). */
public enum TipoConteudo {
    /** {@code publicacao}, módulo Publicações. */
    PUBLICACAO,
    /** Comentário, módulo Discussões (Epic 5, ainda sem tabela). */
    COMENTARIO,
    /** Enquete, módulo Enquetes (Epic 8, ainda sem tabela). */
    ENQUETE
}
