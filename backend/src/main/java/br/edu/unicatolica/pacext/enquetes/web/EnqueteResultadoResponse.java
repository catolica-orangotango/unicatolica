package br.edu.unicatolica.pacext.enquetes.web;

import br.edu.unicatolica.pacext.enquetes.aplicacao.ResultadoEnquete;
import java.util.List;

/** Schema {@code EnqueteResultado} do contrato. */
public record EnqueteResultadoResponse(int totalVotantes, int votosNecessarios, boolean liberado,
        List<EnqueteOpcaoResultadoResponse> opcoes) {

    /** Schema {@code EnqueteOpcaoResultado}. */
    public record EnqueteOpcaoResultadoResponse(Long opcaoId, int votos) {
    }

    static EnqueteResultadoResponse de(ResultadoEnquete resultado) {
        List<EnqueteOpcaoResultadoResponse> opcoes = resultado.votosPorOpcao().entrySet().stream()
                .map(e -> new EnqueteOpcaoResultadoResponse(e.getKey(), e.getValue()))
                .toList();
        return new EnqueteResultadoResponse(resultado.totalVotantes(), resultado.votosNecessarios(),
                resultado.liberado(), opcoes);
    }
}
