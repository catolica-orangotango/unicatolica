package br.edu.unicatolica.pacext.moderacao.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;

/** Validação do motivo de denúncia e de ação de moderação — limite do contrato ({@code maxLength: 1000}). */
final class Motivo {

    static final int TAMANHO_MAXIMO = 1000;

    private Motivo() {
    }

    /** Motivo obrigatório: ausente ou em branco vira 422 {@code CAMPO_OBRIGATORIO}. */
    static String obrigatorio(String motivo, String mensagem) {
        if (motivo == null || motivo.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", mensagem, "motivo");
        }
        return limitado(motivo.strip());
    }

    /** Motivo opcional: em branco vira {@code null}. */
    static String opcional(String motivo) {
        if (motivo == null || motivo.isBlank()) {
            return null;
        }
        return limitado(motivo.strip());
    }

    private static String limitado(String texto) {
        if (texto.length() > TAMANHO_MAXIMO) {
            throw ApiException.validacao("MOTIVO_MUITO_LONGO",
                    "O motivo pode ter até " + TAMANHO_MAXIMO + " caracteres.", "motivo");
        }
        return texto;
    }
}
