package br.edu.unicatolica.pacext.enquetes.aplicacao;

import java.util.Map;

/**
 * Resultado consolidado de uma enquete para quem pode vê-lo (Story 8.5). Com {@code liberado} falso
 * (abaixo do mínimo de votos, RF58.1) {@code votosPorOpcao} fica vazio: só o total aparece.
 */
public record ResultadoEnquete(int totalVotantes, int votosNecessarios, boolean liberado,
        Map<Long, Integer> votosPorOpcao) {
}
