package br.edu.unicatolica.pacext.moderacao.dominio;

/** Situação da denúncia na fila de moderação (RF77, RF80.1). */
public enum SituacaoDenuncia {
    /** Na fila geral, aguardando um moderador. */
    PENDENTE,
    /** Saiu da fila do moderador original e está só na fila do neutro (RF80.1, RF80.2). Sem novo escalonamento. */
    ESCALONADA,
    /** Houve ação sobre o conteúdo ou o autor (ocultar, remover, restringir). */
    RESOLVIDA,
    /** Moderador avaliou e não viu violação. */
    DESCARTADA
}
