package br.edu.unicatolica.pacext.perfil.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.identidade.DadosCadastrais;
import br.edu.unicatolica.pacext.identidade.UsuarioCadastro;
import br.edu.unicatolica.pacext.midia.ArquivoAnexado;
import br.edu.unicatolica.pacext.midia.FinalidadeArquivo;
import br.edu.unicatolica.pacext.midia.MidiaAssociacao;
import br.edu.unicatolica.pacext.midia.MidiaConsulta;
import br.edu.unicatolica.pacext.notificacoes.NotificacaoEmissor;
import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademico;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademicoRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** Testa {@link PerfilService} isoladamente com Mockito — critérios das Stories 4.1, 4.2 e 4.4. */
class PerfilServiceTest {

    private static final Long USUARIO_ID = 42L;
    private static final Long CURSO_ID = 14L;
    private static final DadosCadastrais DADOS =
            new DadosCadastrais(USUARIO_ID, "Ana Lima", CURSO_ID, "Engenharia de Software", null);

    private PerfilService service;
    private PerfilAcademicoRepository repository;
    private UsuarioCadastro usuarioCadastro;
    private NotificacaoEmissor notificacaoEmissor;
    private MidiaAssociacao midiaAssociacao;
    private MidiaConsulta midiaConsulta;

    @BeforeEach
    void setUp() {
        service = new PerfilService();
        repository = mock(PerfilAcademicoRepository.class);
        usuarioCadastro = mock(UsuarioCadastro.class);
        notificacaoEmissor = mock(NotificacaoEmissor.class);
        service.perfilRepository = repository;
        service.usuarioCadastro = usuarioCadastro;
        service.notificacaoEmissor = notificacaoEmissor;
        midiaAssociacao = mock(MidiaAssociacao.class);
        midiaConsulta = mock(MidiaConsulta.class);
        service.midiaAssociacao = midiaAssociacao;
        service.midiaConsulta = midiaConsulta;

        when(usuarioCadastro.buscar(USUARIO_ID)).thenReturn(Optional.of(DADOS));
        when(usuarioCadastro.atualizarNomeECurso(any(), any(), any())).thenReturn(DADOS);
        when(repository.buscarPorUsuarioId(anyLong())).thenReturn(Optional.empty());
    }

    @Test
    void semPerfilAcademicoDevolvePeriodoNuloEInteressesVazio() {
        PerfilCompleto perfil = service.obter(USUARIO_ID);

        assertEquals("Ana Lima", perfil.nome());
        assertEquals(CURSO_ID, perfil.cursoId());
        assertNull(perfil.periodo());
        assertEquals(List.of(), perfil.interesses());
    }

    @Test
    void comPerfilDevolveInteressesEmOrdemAlfabetica() {
        PerfilAcademico existente = perfil((short) 5, "robótica", "Java", "Canto");
        when(repository.buscarPorUsuarioId(USUARIO_ID)).thenReturn(Optional.of(existente));

        PerfilCompleto perfil = service.obter(USUARIO_ID);

        assertEquals((short) 5, perfil.periodo());
        assertEquals(List.of("Canto", "Java", "robótica"), perfil.interesses());
    }

    @Test
    void usuarioInexistenteDa404() {
        when(usuarioCadastro.buscar(99L)).thenReturn(Optional.empty());

        assertCodigo(404, "USUARIO_NAO_ENCONTRADO", () -> service.obter(99L));
    }

    @Test
    void primeiroSalvamentoCriaOPerfilEGravaNomeECursoNoCadastro() {
        PerfilCompleto perfil = service.salvar(USUARIO_ID, "Ana Lima", CURSO_ID, 3, List.of("Java"));

        ArgumentCaptor<PerfilAcademico> captor = ArgumentCaptor.forClass(PerfilAcademico.class);
        verify(repository).persist(captor.capture());
        assertEquals(USUARIO_ID, captor.getValue().usuarioId);
        assertEquals((short) 3, captor.getValue().periodo);
        assertEquals(List.of("Java"), new ArrayList<>(captor.getValue().interesses));
        verify(usuarioCadastro).atualizarNomeECurso(USUARIO_ID, "Ana Lima", CURSO_ID);
        assertEquals((short) 3, perfil.periodo());
    }

    @Test
    void salvarDeNovoSubstituiOPerfilSemCriarOutro() {
        PerfilAcademico existente = perfil((short) 1, "Java", "Canto");
        when(repository.buscarPorUsuarioId(USUARIO_ID)).thenReturn(Optional.of(existente));

        service.salvar(USUARIO_ID, "Ana Lima", CURSO_ID, 2, List.of("Xadrez"));

        verify(repository, never()).persist(any(PerfilAcademico.class));
        assertEquals((short) 2, existente.periodo);
        assertEquals(List.of("Xadrez"), new ArrayList<>(existente.interesses));
        assertSame(existente, repository.buscarPorUsuarioId(USUARIO_ID).orElseThrow());
    }

    @Test
    void juntaInteressesRepetidosSemDiferencaDeMaiusculasOuEspacos() {
        assertEquals(List.of("Java", "Banco de dados"),
                PerfilService.normalizarInteresses(List.of("  Java ", "java", "Banco   de dados", "BANCO DE DADOS")));
    }

    @Test
    void nomeEmBrancoDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.salvar(USUARIO_ID, "  ", CURSO_ID, 3, List.of()));
    }

    @Test
    void nomeAcimaDe200Da422() {
        assertCodigo(422, "NOME_MUITO_LONGO",
                () -> service.salvar(USUARIO_ID, "a".repeat(201), CURSO_ID, 3, List.of()));
    }

    @Test
    void cursoAusenteDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.salvar(USUARIO_ID, "Ana", null, 3, List.of()));
    }

    @Test
    void periodoForaDaFaixaDa422() {
        assertCodigo(422, "PERIODO_INVALIDO", () -> service.salvar(USUARIO_ID, "Ana", CURSO_ID, 0, List.of()));
        assertCodigo(422, "PERIODO_INVALIDO", () -> service.salvar(USUARIO_ID, "Ana", CURSO_ID, 13, List.of()));
        assertCodigo(422, "PERIODO_INVALIDO", () -> service.salvar(USUARIO_ID, "Ana", CURSO_ID, null, List.of()));
    }

    @Test
    void interessesAusenteDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.salvar(USUARIO_ID, "Ana", CURSO_ID, 3, null));
    }

    @Test
    void interesseEmBrancoOuLongoDemaisDa422() {
        assertCodigo(422, "INTERESSE_INVALIDO",
                () -> service.salvar(USUARIO_ID, "Ana", CURSO_ID, 3, List.of("Java", " ")));
        assertCodigo(422, "INTERESSE_INVALIDO",
                () -> service.salvar(USUARIO_ID, "Ana", CURSO_ID, 3, List.of("a".repeat(51))));
        assertCodigo(422, "INTERESSE_INVALIDO",
                () -> service.salvar(USUARIO_ID, "Ana", CURSO_ID, 3, Collections.singletonList(null)));
    }

    @Test
    void maisDeDezInteressesDistintosDa422MasRepetidosNaoContam() {
        List<String> onze = IntStream.rangeClosed(1, 11).mapToObj(i -> "Tema " + i).toList();
        assertCodigo(422, "INTERESSES_DEMAIS", () -> service.salvar(USUARIO_ID, "Ana", CURSO_ID, 3, onze));

        List<String> dezComRepetidos = new ArrayList<>(onze.subList(0, 10));
        dezComRepetidos.add("tema 1");
        assertEquals(10, service.salvar(USUARIO_ID, "Ana", CURSO_ID, 3, dezComRepetidos).interesses().size());
    }

    @Test
    void erroDeValidacaoNaoTocaNoCadastro() {
        assertThrows(ApiException.class, () -> service.salvar(USUARIO_ID, "Ana", CURSO_ID, 13, List.of()));

        verify(usuarioCadastro, never()).atualizarNomeECurso(any(), any(), any());
    }

    @Test
    void salvarComInteresseMarcaAvisoDeOnboardingComoLido() {
        service.salvar(USUARIO_ID, "Ana Lima", CURSO_ID, 3, List.of("Java"));

        verify(notificacaoEmissor).marcarComoLidaPorTipo(USUARIO_ID, TipoNotificacao.ONBOARDING_PERFIL);
    }

    @Test
    void salvarSemInteresseNaoMarcaAvisoDeOnboardingComoLido() {
        service.salvar(USUARIO_ID, "Ana Lima", CURSO_ID, 3, List.of());

        verify(notificacaoEmissor, never()).marcarComoLidaPorTipo(any(), any());
    }

    @Test
    void definirFotoReivindicaGravaELiberaAAnterior() {
        when(usuarioCadastro.atualizarFoto(USUARIO_ID, 9L)).thenReturn(5L);
        when(usuarioCadastro.buscar(USUARIO_ID)).thenReturn(Optional.of(
                new DadosCadastrais(USUARIO_ID, "Ana Lima", CURSO_ID, "Engenharia de Software", 9L)));
        when(midiaConsulta.resolver(List.of(9L))).thenReturn(
                Map.of(9L, new ArquivoAnexado(9L, "foto.png", "image/png", 64, "https://x/foto")));

        PerfilCompleto perfil = service.definirFoto(USUARIO_ID, 9L);

        verify(midiaAssociacao).reivindicar(9L, USUARIO_ID, FinalidadeArquivo.FOTO_PERFIL);
        verify(usuarioCadastro).atualizarFoto(USUARIO_ID, 9L);
        verify(midiaAssociacao).liberar(5L);
        assertEquals("https://x/foto", perfil.fotoUrl());
    }

    @Test
    void definirFotoSemFotoAnteriorNaoLibera() {
        when(usuarioCadastro.atualizarFoto(USUARIO_ID, 9L)).thenReturn(null);

        service.definirFoto(USUARIO_ID, 9L);

        verify(midiaAssociacao, never()).liberar(any());
    }

    @Test
    void definirFotoQueFalhaNaReivindicacaoNaoAlteraAFotoAtual() {
        doThrow(ApiException.naoEncontrado("ARQUIVO_NAO_ENCONTRADO", "Arquivo não encontrado.", null))
                .when(midiaAssociacao).reivindicar(9L, USUARIO_ID, FinalidadeArquivo.FOTO_PERFIL);

        assertCodigo(404, "ARQUIVO_NAO_ENCONTRADO", () -> service.definirFoto(USUARIO_ID, 9L));

        verify(usuarioCadastro, never()).atualizarFoto(any(), any());
        verify(midiaAssociacao, never()).liberar(any());
    }

    @Test
    void definirFotoSemArquivoIdDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.definirFoto(USUARIO_ID, null));

        verify(midiaAssociacao, never()).reivindicar(any(), any(), any());
    }

    @Test
    void removerFotoGravaNuloELiberaAAnterior() {
        when(usuarioCadastro.atualizarFoto(USUARIO_ID, null)).thenReturn(5L);

        PerfilCompleto perfil = service.removerFoto(USUARIO_ID);

        verify(midiaAssociacao).liberar(5L);
        assertNull(perfil.fotoUrl());
    }

    @Test
    void removerFotoSemFotoAnteriorNaoLibera() {
        when(usuarioCadastro.atualizarFoto(USUARIO_ID, null)).thenReturn(null);

        service.removerFoto(USUARIO_ID);

        verify(midiaAssociacao, never()).liberar(any());
    }

    private static PerfilAcademico perfil(short periodo, String... interesses) {
        PerfilAcademico perfil = new PerfilAcademico();
        perfil.usuarioId = USUARIO_ID;
        perfil.periodo = periodo;
        perfil.interesses.addAll(Arrays.asList(interesses));
        return perfil;
    }

    private static void assertCodigo(int status, String code, Runnable acao) {
        ApiException erro = assertThrows(ApiException.class, acao::run);
        assertEquals(status, erro.getStatus());
        assertEquals(code, erro.getCode());
    }
}
