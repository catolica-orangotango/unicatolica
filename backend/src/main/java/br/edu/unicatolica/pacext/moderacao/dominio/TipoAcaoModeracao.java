package br.edu.unicatolica.pacext.moderacao.dominio;

/** Decisão de moderação registrada em {@code acao_moderacao}. */
public enum TipoAcaoModeracao {
    /** Reversível (RF78); exige motivo, enviado ao autor (RF78.2). */
    OCULTAR,
    /** Qualquer moderador ou administrador, não só quem ocultou (RF78.1). */
    RESTAURAR,
    /** Definitivo (RF79); exige motivo, enviado ao autor (RF79.2). */
    REMOVER,
    /** Cria uma {@link RestricaoUsuario} (RF80); exige motivo. */
    RESTRINGIR_USUARIO,
    /** Passa a denúncia a um moderador neutro (RF80.1). */
    ESCALONAR,
    /** Encerra a denúncia sem ação sobre o conteúdo. */
    DESCARTAR
}
