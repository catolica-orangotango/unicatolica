package br.edu.unicatolica.pacext.enquetes.dominio;

/**
 * Toda enquete nasce {@code ATIVA}. Só a ativa aceita voto (Story 8.3): {@code ENCERRADA} chega com a
 * Story 8.6 (RF58.2–RF58.5) e {@code OCULTA} é gravada pela Moderação (RF55.3, Story 12.5).
 */
public enum SituacaoEnquete {
    ATIVA,
    ENCERRADA,
    OCULTA
}
