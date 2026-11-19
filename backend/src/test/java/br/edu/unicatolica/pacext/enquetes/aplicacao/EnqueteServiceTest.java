package br.edu.unicatolica.pacext.enquetes.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.comunidades.ComunidadeConsulta;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.enquetes.dominio.Enquete;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteRepository;
import br.edu.unicatolica.pacext.enquetes.dominio.SituacaoEnquete;
import br.edu.unicatolica.pacext.enquetes.dominio.TipoEnquete;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testa {@link EnqueteService} isoladamente com Mockito — critérios da Story 8.1. */
class EnqueteServiceTest {

    private static final Long USUARIO_ID = 42L;
    private static final Long COMUNIDADE_ID = 7L;
    private static final List<String> OPCOES = List.of("Segunda", "Terça", "Quarta");

    private EnqueteService service;
    private EnqueteRepository repository;
    private ComunidadeConsulta comunidadeConsulta;

    @BeforeEach
    void setUp() {
        service = new EnqueteService();
        repository = mock(EnqueteRepository.class);
        comunidadeConsulta = mock(ComunidadeConsulta.class);
        service.enqueteRepository = repository;
        service.comunidadeConsulta = comunidadeConsulta;

        when(comunidadeConsulta.existe(COMUNIDADE_ID)).thenReturn(true);
        when(comunidadeConsulta.ehMembro(COMUNIDADE_ID, USUARIO_ID)).thenReturn(true);
        when(repository.contarAtivasDoAutorNaComunidade(USUARIO_ID, COMUNIDADE_ID)).thenReturn(0L);
    }

    @Test
    void membroCriaEnqueteDeEscolhaUnicaAssociadaAEleEAComunidade() {
        Enquete enquete = service.criar(USUARIO_ID, COMUNIDADE_ID, "  Melhor dia?  ", "UNICA", 3, OPCOES);

        verify(repository).persist(enquete);
        assertEquals(USUARIO_ID, enquete.autorUsuarioId);
        assertEquals(COMUNIDADE_ID, enquete.comunidadeId);
        assertEquals("Melhor dia?", enquete.pergunta);
        assertEquals(TipoEnquete.UNICA, enquete.tipo);
        assertNull(enquete.limiteSelecao, "limite é descartado em escolha única");
        assertEquals(SituacaoEnquete.ATIVA, enquete.situacao);
        assertNotNull(enquete.criadaEm);
        assertEquals(List.of("Segunda", "Terça", "Quarta"), enquete.opcoes.stream().map(o -> o.texto).toList());
        assertEquals(List.of(0, 1, 2), enquete.opcoes.stream().map(o -> o.posicao).toList());
    }

    @Test
    void escolhaMultiplaGuardaOLimiteEAceitaOpcoesComEspacosNasPontas() {
        Enquete enquete = service.criar(USUARIO_ID, COMUNIDADE_ID, "Dias?", "multipla", 2,
                List.of(" Segunda ", "Terça"));

        assertEquals(TipoEnquete.MULTIPLA, enquete.tipo);
        assertEquals(2, enquete.limiteSelecao);
        assertEquals("Segunda", enquete.opcoes.get(0).texto);
    }

    @Test
    void perguntaAusenteOuEmBrancoDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, null, "UNICA", null, OPCOES));
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, " \t ", "UNICA", null, OPCOES));
    }

    @Test
    void perguntaAcimaDoLimiteDa422() {
        String longa = "a".repeat(EnqueteService.TAMANHO_MAXIMO_PERGUNTA + 1);

        assertCodigo(422, "PERGUNTA_MUITO_LONGA", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, longa, "UNICA", null, OPCOES));
    }

    @Test
    void tipoAusenteOuDesconhecidoDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", null, null, OPCOES));
        assertCodigo(422, "TIPO_INVALIDO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "TRIPLA", null, OPCOES));
    }

    @Test
    void menosDeDuasOpcoesDa422() {
        assertCodigo(422, "QUANTIDADE_OPCOES_INVALIDA",
                () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, List.of("Só uma")));
        assertCodigo(422, "QUANTIDADE_OPCOES_INVALIDA",
                () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, null));
    }

    @Test
    void maisDeCincoOpcoesDa422() {
        List<String> seis = List.of("a", "b", "c", "d", "e", "f");

        assertCodigo(422, "QUANTIDADE_OPCOES_INVALIDA", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, seis));
    }

    @Test
    void cincoOpcoesSaoAceitas() {
        Enquete enquete = service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, List.of("a", "b", "c", "d", "e"));

        assertEquals(5, enquete.opcoes.size());
    }

    @Test
    void opcaoEmBrancoNulaOuLongaDa422() {
        assertCodigo(422, "OPCAO_VAZIA", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, List.of("a", " ")));
        assertCodigo(422, "OPCAO_VAZIA", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, Arrays.asList("a", null)));
        String longa = "a".repeat(EnqueteService.TAMANHO_MAXIMO_OPCAO + 1);
        assertCodigo(422, "OPCAO_MUITO_LONGA", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, List.of("a", longa)));
    }

    @Test
    void opcaoRepetidaIgnorandoCaixaEEspacosDa422() {
        assertCodigo(422, "OPCAO_DUPLICADA",
                () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, List.of("Sim", " sim ")));
    }

    @Test
    void escolhaMultiplaSemLimiteDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "MULTIPLA", null, OPCOES));
    }

    @Test
    void limiteForaDeDuasAteOTotalDeOpcoesDa422() {
        assertCodigo(422, "LIMITE_SELECAO_INVALIDO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "MULTIPLA", 1, OPCOES));
        assertCodigo(422, "LIMITE_SELECAO_INVALIDO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "MULTIPLA", 4, OPCOES));
    }

    @Test
    void comunidadeInexistenteDa404() {
        when(comunidadeConsulta.existe(COMUNIDADE_ID)).thenReturn(false);

        assertCodigo(404, "COMUNIDADE_NAO_ENCONTRADA", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, OPCOES));
        verify(repository, never()).persist(any(Enquete.class));
    }

    @Test
    void naoMembroDa403() {
        when(comunidadeConsulta.ehMembro(COMUNIDADE_ID, USUARIO_ID)).thenReturn(false);

        assertCodigo(403, "NAO_E_MEMBRO", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, OPCOES));
        verify(repository, never()).persist(any(Enquete.class));
    }

    @Test
    void terceiraEnqueteAtivaNaComunidadeDa409() {
        when(repository.contarAtivasDoAutorNaComunidade(USUARIO_ID, COMUNIDADE_ID)).thenReturn(2L);

        assertCodigo(409, "LIMITE_ENQUETES_ATIVAS", () -> service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, OPCOES));
        verify(repository, never()).persist(any(Enquete.class));
    }

    @Test
    void segundaEnqueteAtivaAindaEAceita() {
        when(repository.contarAtivasDoAutorNaComunidade(USUARIO_ID, COMUNIDADE_ID)).thenReturn(1L);

        Enquete enquete = service.criar(USUARIO_ID, COMUNIDADE_ID, "P?", "UNICA", null, OPCOES);

        assertNotNull(enquete);
    }

    @Test
    void listarDaComunidadeInexistenteDa404() {
        when(comunidadeConsulta.existe(COMUNIDADE_ID)).thenReturn(false);

        assertCodigo(404, "COMUNIDADE_NAO_ENCONTRADA", () -> service.listarDaComunidade(COMUNIDADE_ID, 0, 20));
    }

    @Test
    void listagemTrazPaginaETamanhoParaDentroDaFaixaDoContrato() {
        when(repository.listarPorComunidade(anyLong(), org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyInt()))
                .thenReturn(List.of());
        when(repository.contarPorComunidade(COMUNIDADE_ID)).thenReturn(0L);

        service.listarDaComunidade(COMUNIDADE_ID, -5, 9999);

        verify(repository).listarPorComunidade(COMUNIDADE_ID, 0, EnqueteService.TAMANHO_MAXIMO_PAGINA);
    }

    private static void assertCodigo(int status, String code, Runnable acao) {
        ApiException erro = assertThrows(ApiException.class, acao::run);
        assertEquals(status, erro.getStatus());
        assertEquals(code, erro.getCode());
    }
}
