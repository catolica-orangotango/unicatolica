package br.edu.unicatolica.pacext.moderacao.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.moderacao.dominio.AcaoModeracao;
import br.edu.unicatolica.pacext.moderacao.dominio.AcaoModeracaoRepository;
import br.edu.unicatolica.pacext.moderacao.dominio.Denuncia;
import br.edu.unicatolica.pacext.moderacao.dominio.DenunciaRepository;
import br.edu.unicatolica.pacext.moderacao.dominio.SituacaoDenuncia;
import br.edu.unicatolica.pacext.moderacao.dominio.TipoAcaoModeracao;
import br.edu.unicatolica.pacext.moderacao.dominio.TipoConteudo;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeracao;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeravel;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** Testa {@link ModeracaoService} isoladamente com Mockito — critérios das Stories 12.4 e 12.5. */
class ModeracaoServiceTest {

    private static final Long MODERADOR = 1L;
    private static final Long PUBLICACAO = 7L;
    private static final Long DENUNCIA = 10L;

    private ModeracaoService service;
    private DenunciaRepository denunciaRepository;
    private AcaoModeracaoRepository acaoRepository;
    private PublicacaoModeracao publicacaoModeracao;
    private AuditoriaService auditoriaService;
    private UsuarioAutenticado usuarioAutenticado;
    private Denuncia denuncia;

    @BeforeEach
    void setUp() {
        service = new ModeracaoService();
        denunciaRepository = mock(DenunciaRepository.class);
        acaoRepository = mock(AcaoModeracaoRepository.class);
        publicacaoModeracao = mock(PublicacaoModeracao.class);
        auditoriaService = mock(AuditoriaService.class);
        usuarioAutenticado = mock(UsuarioAutenticado.class);
        service.denunciaRepository = denunciaRepository;
        service.acaoModeracaoRepository = acaoRepository;
        service.publicacaoModeracao = publicacaoModeracao;
        service.auditoriaService = auditoriaService;
        service.usuarioAutenticado = usuarioAutenticado;

        when(usuarioAutenticado.possuiPerfil("MODERADOR")).thenReturn(true);
        when(usuarioAutenticado.id()).thenReturn(MODERADOR);
        denuncia = denuncia(DENUNCIA);
        when(denunciaRepository.findByIdOptional(DENUNCIA)).thenReturn(Optional.of(denuncia));
        when(publicacaoModeracao.buscar(PUBLICACAO)).thenReturn(Optional.of(publicacao(false)));
    }

    @Test
    void listarJuntaAPostagemDeCadaDenunciaEmLote() {
        when(denunciaRepository.listarPorSituacao(SituacaoDenuncia.PENDENTE, 0, 20)).thenReturn(List.of(denuncia));
        when(denunciaRepository.contarPorSituacao(SituacaoDenuncia.PENDENTE)).thenReturn(1L);
        when(publicacaoModeracao.buscar(List.of(PUBLICACAO))).thenReturn(Map.of(PUBLICACAO, publicacao(false)));

        PageResponse<DenunciaEmAnalise> pagina = service.listar(null, 0, 20);

        assertEquals(1, pagina.content().size());
        assertEquals(denuncia, pagina.content().get(0).denuncia());
        assertEquals(PUBLICACAO, pagina.content().get(0).conteudo().id());
        assertEquals(1L, pagina.totalElements());
    }

    @Test
    void listarFiltraPelaSituacaoETrazPaginacaoParaDentroDaFaixa() {
        when(denunciaRepository.listarPorSituacao(any(), anyInt(), anyInt())).thenReturn(List.of());

        PageResponse<DenunciaEmAnalise> pagina = service.listar("RESOLVIDA", -1, 500);

        assertEquals(0, pagina.page());
        assertEquals(ModeracaoService.TAMANHO_MAXIMO_PAGINA, pagina.size());
        verify(denunciaRepository).listarPorSituacao(SituacaoDenuncia.RESOLVIDA, 0, ModeracaoService.TAMANHO_MAXIMO_PAGINA);
    }

    @Test
    void situacaoForaDoFiltroDa422() {
        assertCodigo(422, "PARAMETRO_INVALIDO", () -> service.listar("ESCALONADA", 0, 20));
    }

    @Test
    void naoModeradorDa403EmTodaOperacao() {
        when(usuarioAutenticado.possuiPerfil("MODERADOR")).thenReturn(false);

        assertCodigo(403, "ACESSO_NEGADO", () -> service.listar(null, 0, 20));
        assertCodigo(403, "ACESSO_NEGADO", () -> service.obter(DENUNCIA));
        assertCodigo(403, "ACESSO_NEGADO", () -> service.ocultar(DENUNCIA, "ofensivo"));
        assertCodigo(403, "ACESSO_NEGADO", () -> service.restaurar(DENUNCIA));
        assertCodigo(403, "ACESSO_NEGADO", () -> service.descartar(DENUNCIA, null));
    }

    @Test
    void denunciaInexistenteDa404() {
        when(denunciaRepository.findByIdOptional(99L)).thenReturn(Optional.empty());

        assertCodigo(404, "DENUNCIA_NAO_ENCONTRADA", () -> service.obter(99L));
        assertCodigo(404, "DENUNCIA_NAO_ENCONTRADA", () -> service.ocultar(99L, "ofensivo"));
        assertCodigo(404, "DENUNCIA_NAO_ENCONTRADA", () -> service.restaurar(99L));
        assertCodigo(404, "DENUNCIA_NAO_ENCONTRADA", () -> service.descartar(99L, null));
    }

    @Test
    void ocultarEscondeAPostagemEResolveTodasAsPendentesDoConteudo() {
        Denuncia outra = denuncia(11L);
        when(denunciaRepository.listarPendentesDoConteudo(TipoConteudo.PUBLICACAO, PUBLICACAO))
                .thenReturn(List.of(denuncia, outra));

        service.ocultar(DENUNCIA, "  ofensivo  ");

        verify(publicacaoModeracao).ocultar(PUBLICACAO);
        assertEquals(SituacaoDenuncia.RESOLVIDA, denuncia.situacao);
        assertEquals(SituacaoDenuncia.RESOLVIDA, outra.situacao);
        assertNotNull(denuncia.resolvidaEm);
        ArgumentCaptor<AcaoModeracao> acoes = ArgumentCaptor.forClass(AcaoModeracao.class);
        verify(acaoRepository, times(2)).persist(acoes.capture());
        acoes.getAllValues().forEach(a -> {
            assertEquals(TipoAcaoModeracao.OCULTAR, a.tipoAcao);
            assertEquals(MODERADOR, a.moderadorUsuarioId);
            assertEquals("ofensivo", a.motivo);
        });
        verify(auditoriaService).registrar(eq(MODERADOR), eq("moderacao"), eq("CONTEUDO_OCULTADO"), eq("Publicacao"),
                eq(PUBLICACAO), anyString());
    }

    @Test
    void ocultarSemMotivoDa422() {
        assertCodigo(422, "CAMPO_OBRIGATORIO", () -> service.ocultar(DENUNCIA, " "));
        verify(publicacaoModeracao, never()).ocultar(anyLong());
    }

    @Test
    void ocultarDenunciaJaAnalisadaDa409() {
        denuncia.situacao = SituacaoDenuncia.DESCARTADA;

        assertCodigo(409, "SITUACAO_INVALIDA", () -> service.ocultar(DENUNCIA, "ofensivo"));
        verify(publicacaoModeracao, never()).ocultar(anyLong());
    }

    @Test
    void restaurarDevolveAPostagemEMantemDenunciaResolvida() {
        denuncia.situacao = SituacaoDenuncia.RESOLVIDA;
        when(publicacaoModeracao.buscar(PUBLICACAO)).thenReturn(Optional.of(publicacao(true)));

        service.restaurar(DENUNCIA);

        verify(publicacaoModeracao).restaurar(PUBLICACAO);
        assertEquals(SituacaoDenuncia.RESOLVIDA, denuncia.situacao);
        ArgumentCaptor<AcaoModeracao> acao = ArgumentCaptor.forClass(AcaoModeracao.class);
        verify(acaoRepository).persist(acao.capture());
        assertEquals(TipoAcaoModeracao.RESTAURAR, acao.getValue().tipoAcao);
        verify(auditoriaService).registrar(eq(MODERADOR), eq("moderacao"), eq("CONTEUDO_RESTAURADO"), eq("Publicacao"),
                eq(PUBLICACAO), anyString());
    }

    @Test
    void restaurarConteudoVisivelDa409() {
        denuncia.situacao = SituacaoDenuncia.RESOLVIDA;

        assertCodigo(409, "SITUACAO_INVALIDA", () -> service.restaurar(DENUNCIA));
        verify(publicacaoModeracao, never()).restaurar(anyLong());
    }

    @Test
    void restaurarDenunciaPendenteDa409() {
        assertCodigo(409, "SITUACAO_INVALIDA", () -> service.restaurar(DENUNCIA));
    }

    @Test
    void descartarEncerraSoEstaDenunciaSemMexerNoConteudo() {
        service.descartar(DENUNCIA, "  ");

        assertEquals(SituacaoDenuncia.DESCARTADA, denuncia.situacao);
        assertNotNull(denuncia.resolvidaEm);
        verify(publicacaoModeracao, never()).ocultar(anyLong());
        verify(denunciaRepository, never()).listarPendentesDoConteudo(any(), anyLong());
        ArgumentCaptor<AcaoModeracao> acao = ArgumentCaptor.forClass(AcaoModeracao.class);
        verify(acaoRepository).persist(acao.capture());
        assertEquals(TipoAcaoModeracao.DESCARTAR, acao.getValue().tipoAcao);
        assertNull(acao.getValue().motivo);
    }

    @Test
    void descartarDenunciaJaAnalisadaDa409() {
        denuncia.situacao = SituacaoDenuncia.RESOLVIDA;

        assertCodigo(409, "SITUACAO_INVALIDA", () -> service.descartar(DENUNCIA, null));
    }

    @Test
    void descartarComMotivoAcimaDoLimiteDa422() {
        assertCodigo(422, "MOTIVO_MUITO_LONGO", () -> service.descartar(DENUNCIA, "a".repeat(Motivo.TAMANHO_MAXIMO + 1)));
    }

    private static Denuncia denuncia(Long id) {
        Denuncia d = new Denuncia();
        d.id = id;
        d.tipoConteudo = TipoConteudo.PUBLICACAO;
        d.conteudoId = PUBLICACAO;
        d.autorConteudoUsuarioId = 43L;
        d.denuncianteUsuarioId = 42L;
        d.motivo = "spam";
        d.criadoEm = Instant.now();
        return d;
    }

    private static PublicacaoModeravel publicacao(boolean oculta) {
        return new PublicacaoModeravel(PUBLICACAO, 1L, 43L, "texto", Instant.now(), oculta);
    }

    private static void assertCodigo(int status, String code, Runnable acao) {
        ApiException erro = assertThrows(ApiException.class, acao::run);
        assertEquals(status, erro.getStatus());
        assertEquals(code, erro.getCode());
    }
}
