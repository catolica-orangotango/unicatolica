package br.edu.unicatolica.pacext.publicacoes.dominio;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.PersistenceException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Prova contra o Postgres real que as migrations {@code publicacoes-001/002} e o feed da comunidade funcionam. */
@QuarkusTest
class PublicacaoRepositoryTest {

    // Ids fora da faixa dos seeds: sem FK (AD-3), a tabela aceita qualquer id.
    private static final Long COMUNIDADE = 900_001L;
    private static final Long OUTRA_COMUNIDADE = 900_002L;
    private static final Long AUTOR = 800_001L;

    @Inject
    PublicacaoRepository repository;

    @Test
    @TestTransaction
    void listarPorComunidadeTrazSoAComunidadeMaisRecentePrimeiro() {
        Instant agora = Instant.now();
        Publicacao antiga = persistir(COMUNIDADE, "antiga", agora.minusSeconds(60));
        Publicacao nova = persistir(COMUNIDADE, "nova", agora);
        persistir(OUTRA_COMUNIDADE, "de outra comunidade", agora);

        List<Publicacao> feed = repository.listarPorComunidade(COMUNIDADE, 0, 10);

        assertEquals(List.of(nova.id, antiga.id), feed.stream().map(p -> p.id).toList());
        assertEquals(2, repository.contarPorComunidade(COMUNIDADE));
    }

    @Test
    @TestTransaction
    void listarPorComunidadePagina() {
        Instant agora = Instant.now();
        for (int i = 0; i < 3; i++) {
            persistir(COMUNIDADE, "post " + i, agora.plusSeconds(i));
        }

        List<Publicacao> segundaPagina = repository.listarPorComunidade(COMUNIDADE, 1, 2);

        assertEquals(List.of("post 0"), segundaPagina.stream().map(p -> p.conteudo).toList());
    }

    @Test
    @TestTransaction
    void feedNaoTrazNemContaPostagemOculta() {
        Instant agora = Instant.now();
        Publicacao visivel = persistir(COMUNIDADE, "visível", agora.minusSeconds(60));
        Publicacao oculta = persistir(COMUNIDADE, "oculta", agora);
        oculta.situacao = SituacaoPublicacao.OCULTA;
        repository.flush();

        assertEquals(List.of(visivel.id), repository.listarPorComunidade(COMUNIDADE, 0, 10).stream().map(p -> p.id).toList());
        assertEquals(1, repository.contarPorComunidade(COMUNIDADE));
        assertEquals(List.of(oculta.id), repository.buscarPorIds(List.of(oculta.id)).stream().map(p -> p.id).toList());
    }

    @Test
    @TestTransaction
    void postagemNovaNasceVisivel() {
        Publicacao publicacao = persistir(COMUNIDADE, "nova", Instant.now());
        repository.getEntityManager().refresh(publicacao);

        assertEquals(SituacaoPublicacao.VISIVEL, publicacao.situacao);
    }

    @Test
    @TestTransaction
    void bancoRejeitaConteudoEmBranco() {
        assertThrows(PersistenceException.class, () -> persistir(COMUNIDADE, "   ", Instant.now()));
    }

    private Publicacao persistir(Long comunidadeId, String conteudo, Instant criadoEm) {
        Publicacao publicacao = new Publicacao();
        publicacao.comunidadeId = comunidadeId;
        publicacao.autorUsuarioId = AUTOR;
        publicacao.conteudo = conteudo;
        publicacao.criadoEm = criadoEm;
        repository.persistAndFlush(publicacao);
        return publicacao;
    }
}
