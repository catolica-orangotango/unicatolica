package br.edu.unicatolica.pacext.enquetes.web;

import java.util.List;

/**
 * Corpo de {@code POST /comunidades/{id}/enquetes} — schema {@code EnqueteRequest} do contrato.
 * {@code tipo} chega como texto para um valor desconhecido virar 422, não um erro de leitura do JSON.
 */
public record EnqueteRequest(String pergunta, String tipo, Integer limiteSelecao, List<String> opcoes) {
}
