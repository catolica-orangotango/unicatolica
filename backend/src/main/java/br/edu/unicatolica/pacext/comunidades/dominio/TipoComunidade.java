package br.edu.unicatolica.pacext.comunidades.dominio;

/**
 * Tipo de comunidade (RF21.1) — definido na criação e imutável depois (aplicado no
 * {@code Service}, não há operação de update de tipo em nenhum fluxo).
 */
public enum TipoComunidade {
    /** Associação automática (RF24.1); criação restrita a administrador da plataforma (RF21.2). */
    CURSO,
    /** Criação livre por qualquer aluno; ingresso voluntário (RF24). */
    ABERTA
}
