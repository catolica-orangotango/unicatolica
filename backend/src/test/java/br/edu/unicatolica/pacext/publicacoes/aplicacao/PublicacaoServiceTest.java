package br.edu.unicatolica.pacext.publicacoes.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.comunidades.ComunidadeConsulta;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.publicacoes.dominio.Publicacao;
import br.edu.unicatolica.pacext.publicacoes.dominio.PublicacaoRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testa {@link PublicacaoService} isoladamente com Mockito — critérios das Stories 3.1 e 3.2. */
class PublicacaoServiceTest {

    private static final Long USUARIO_ID = 42L;
    private static final Long COMUNIDADE_ID = 7L;

    private PublicacaoService service;
    private PublicacaoRepository repository;
    private ComunidadeConsulta comunidadeConsulta;

    @BeforeEach
    void setUp() {
        service = new PublicacaoService();
        repository = mock(PublicacaoRepository.class);
        comunidadeConsulta = mock(ComunidadeConsulta.class);
        service.publicacaoRepository = repository;
        service.comunidadeConsulta = comunidadeConsulta;

        when(comunidadeConsulta.existe(COMUNIDADE_ID)).thenReturn(true);
        when(comunidadeConsulta.ehMembro(COMUNIDADE_ID, USUARIO_ID)).thenReturn(true);
    }

    @Test
    void membroCriaPostagemAssociadaAEleEAComunidade() {
        Publicacao publicacao = service.criar(USUARIO_ID, COMUNIDADE_ID, "  Alguém tem o material de Cálculo?  ");

        verify(repository).persist(publicacao);
        assertEquals(USUARIO_ID, publicacao.autorUsuarioId);
        assertEquals(COMUNIDADE_ID, publicacao.comunidadeId);
        assertEquals("Alguém tem o material de Cálculo?", publicacao.conteudo);
        assertNotNull(publicacao.criadoEm);
    }

    @Test
    void conteudoAusenteDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, null));
    }

    @Test
    void conteudoEmBrancoDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, " \n\t "));
    }

    @Test
    void conteudoAcimaDoLimiteDa422() {
        String longo = "a".repeat(PublicacaoService.TAMANHO_MAXIMO_CONTEUDO + 1);

        assertCodigo(422, "CONTEUDO_MUITO_LONGO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, longo));
    }

    @Test
    void conteudoNoLimiteEAceito() {
        String noLimite = "a".repeat(PublicacaoService.TAMANHO_MAXIMO_CONTEUDO);

        assertEquals(noLimite, service.criar(USUARIO_ID, COMUNIDADE_ID, noLimite).conteudo);
    }

    @Test
    void comunidadeInexistenteDa404AoCriar() {
        when(comunidadeConsulta.existe(COMUNIDADE_ID)).thenReturn(false);

        assertCodigo(404, "COMUNIDADE_NAO_ENCONTRADA", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "oi"));
    }

    @Test
    void naoMembroDa403() {
        when(comunidadeConsulta.ehMembro(COMUNIDADE_ID, USUARIO_ID)).thenReturn(false);

        assertCodigo(403, "NAO_E_MEMBRO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "oi"));
        verify(repository, never()).persist(any(Publicacao.class));
    }

    @Test
    void listarDevolvePaginaComTotal() {
        Publicacao publicacao = new Publicacao();
        when(repository.listarPorComunidade(COMUNIDADE_ID, 1, 10)).thenReturn(List.of(publicacao));
        when(repository.contarPorComunidade(COMUNIDADE_ID)).thenReturn(11L);

        PageResponse<Publicacao> pagina = service.listar(COMUNIDADE_ID, 1, 10);

        assertEquals(List.of(publicacao), pagina.content());
        assertEquals(1, pagina.page());
        assertEquals(10, pagina.size());
        assertEquals(11L, pagina.totalElements());
        assertEquals(2, pagina.totalPages());
    }

    @Test
    void listarTrazPaginacaoForaDaFaixaParaDentroDela() {
        when(repository.listarPorComunidade(anyLong(), anyInt(), anyInt())).thenReturn(List.of());

        PageResponse<Publicacao> pagina = service.listar(COMUNIDADE_ID, -3, 500);

        assertEquals(0, pagina.page());
        assertEquals(PublicacaoService.TAMANHO_MAXIMO_PAGINA, pagina.size());
        verify(repository).listarPorComunidade(COMUNIDADE_ID, 0, PublicacaoService.TAMANHO_MAXIMO_PAGINA);
    }

    @Test
    void comunidadeInexistenteDa404AoListar() {
        when(comunidadeConsulta.existe(COMUNIDADE_ID)).thenReturn(false);

        assertCodigo(404, "COMUNIDADE_NAO_ENCONTRADA", () -> service.listar(COMUNIDADE_ID, 0, 20));
    }

    private static void assertCodigo(int status, String code, Runnable acao) {
        ApiException erro = assertThrows(ApiException.class, acao::run);
        assertEquals(status, erro.getStatus());
        assertEquals(code, erro.getCode());
    }
}
