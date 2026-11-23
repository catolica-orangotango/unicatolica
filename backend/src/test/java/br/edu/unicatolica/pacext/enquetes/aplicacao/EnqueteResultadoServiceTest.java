package br.edu.unicatolica.pacext.enquetes.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.enquetes.dominio.Enquete;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteOpcao;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteParticipacaoRepository;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteVotoRepository;
import br.edu.unicatolica.pacext.enquetes.dominio.SituacaoEnquete;
import br.edu.unicatolica.pacext.enquetes.dominio.TipoEnquete;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testa {@link EnqueteService#resultados} isoladamente — critérios da Story 8.5 (RF57, RF58, RF58.1). */
class EnqueteResultadoServiceTest {

    private static final Long ENQUETE_ID = 100L;

    private EnqueteService service;
    private EnqueteParticipacaoRepository participacaoRepository;
    private EnqueteVotoRepository votoRepository;

    @BeforeEach
    void setUp() {
        service = new EnqueteService();
        participacaoRepository = mock(EnqueteParticipacaoRepository.class);
        votoRepository = mock(EnqueteVotoRepository.class);
        service.participacaoRepository = participacaoRepository;
        service.votoRepository = votoRepository;
    }

    private static Enquete enquete(SituacaoEnquete situacao) {
        Enquete enquete = new Enquete();
        enquete.id = ENQUETE_ID;
        enquete.tipo = TipoEnquete.UNICA;
        enquete.situacao = situacao;
        for (long id = 1; id <= 3; id++) {
            EnqueteOpcao opcao = new EnqueteOpcao();
            opcao.id = id;
            opcao.enquete = enquete;
            opcao.texto = "Opção " + id;
            enquete.opcoes.add(opcao);
        }
        return enquete;
    }

    private void comTotalEVotos(int total, Map<Long, Integer> votos) {
        when(participacaoRepository.totalPorEnquete(anyCollection())).thenReturn(Map.of(ENQUETE_ID, total));
        when(votoRepository.contagemPorOpcao(anyCollection())).thenReturn(votos);
    }

    @Test
    void ativaComCincoVotosEQuemVotouVeAsBarras_opcaoSemVotoVaiComZero() {
        comTotalEVotos(5, Map.of(1L, 3, 2L, 2));

        ResultadoEnquete r = service.resultados(List.of(enquete(SituacaoEnquete.ATIVA)), Set.of(ENQUETE_ID)).get(ENQUETE_ID);

        assertTrue(r.liberado());
        assertEquals(5, r.totalVotantes());
        assertEquals(Map.of(1L, 3, 2L, 2, 3L, 0), r.votosPorOpcao());
    }

    @Test
    void ativaComMenosDeCincoVotosMostraSoOTotal_semContagemPorOpcao() {
        comTotalEVotos(4, Map.of(1L, 4));

        ResultadoEnquete r = service.resultados(List.of(enquete(SituacaoEnquete.ATIVA)), Set.of(ENQUETE_ID)).get(ENQUETE_ID);

        assertFalse(r.liberado());
        assertEquals(4, r.totalVotantes());
        assertEquals(5, r.votosNecessarios());
        assertTrue(r.votosPorOpcao().isEmpty(), "a contagem por opção não sai abaixo do mínimo (RF58.1)");
    }

    @Test
    void quemNaoVotouNumaAtivaNaoVeResultadoNemOTotal_semConsultarOBanco() {
        Map<Long, ResultadoEnquete> r = service.resultados(List.of(enquete(SituacaoEnquete.ATIVA)), Set.of());

        assertNull(r.get(ENQUETE_ID));
        verify(participacaoRepository, never()).totalPorEnquete(anyCollection());
        verify(votoRepository, never()).contagemPorOpcao(anyCollection());
    }

    @Test
    void encerradaMostraOResultadoCompletoATodos_mesmoSemVotarEAbaixoDoMinimo() {
        comTotalEVotos(2, Map.of(3L, 2));

        ResultadoEnquete r = service.resultados(List.of(enquete(SituacaoEnquete.ENCERRADA)), Set.of()).get(ENQUETE_ID);

        assertTrue(r.liberado());
        assertEquals(Map.of(1L, 0, 2L, 0, 3L, 2), r.votosPorOpcao());
    }

    @Test
    void ocultaNuncaMostraResultado() {
        assertTrue(service.resultados(List.of(enquete(SituacaoEnquete.OCULTA)), Set.of(ENQUETE_ID)).isEmpty());
    }
}
