package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.comunidades.dominio.Comunidade;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembro;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembroRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.PapelMembro;
import br.edu.unicatolica.pacext.comunidades.dominio.TipoComunidade;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Testa {@link ComunidadeService} isoladamente com Mockito — critérios das Stories 2.2,
 * 2.4 e 2.5. Entrada rápida desta fatia (ver docs/decisoes/2026-08-modelo-epico-2-comunidades.md).
 */
class ComunidadeServiceTest {

    private static final Long USUARIO_ID = 42L;

    private ComunidadeService service;
    private ComunidadeRepository comunidadeRepository;
    private ComunidadeMembroRepository comunidadeMembroRepository;

    @BeforeEach
    void setUp() {
        service = new ComunidadeService();
        comunidadeRepository = mock(ComunidadeRepository.class);
        comunidadeMembroRepository = mock(ComunidadeMembroRepository.class);
        service.comunidadeRepository = comunidadeRepository;
        service.comunidadeMembroRepository = comunidadeMembroRepository;
        service.auditoriaService = mock(AuditoriaService.class);

        doAnswer(invocation -> {
            Comunidade comunidade = invocation.getArgument(0);
            comunidade.id = 1L;
            return null;
        }).when(comunidadeRepository).persist(any(Comunidade.class));
    }

    @Test
    void criaComunidadeAbertaEAssociaCriadorComoAdministrador() {
        Comunidade comunidade = service.criarComunidadeAberta(USUARIO_ID, "Xadrez", "Comunidade de xadrez");

        assertEquals("Xadrez", comunidade.nome);
        assertEquals(TipoComunidade.ABERTA, comunidade.tipo);
        assertEquals(USUARIO_ID, comunidade.criadoPorUsuarioId);

        ArgumentCaptor<ComunidadeMembro> captor = ArgumentCaptor.forClass(ComunidadeMembro.class);
        verify(comunidadeMembroRepository).persist(captor.capture());
        assertEquals(PapelMembro.ADMINISTRADOR, captor.getValue().papelNaComunidade);
        assertEquals(USUARIO_ID, captor.getValue().usuarioId);
    }

    @Test
    void rejeitaCriacaoSemNome() {
        ApiException erro = assertThrows(ApiException.class,
                () -> service.criarComunidadeAberta(USUARIO_ID, " ", null));

        assertEquals("CAMPO_OBRIGATORIO", erro.getCode());
        verify(comunidadeRepository, never()).persist(any(Comunidade.class));
    }

    @Test
    void rejeitaCriacaoComNomeJaExistente() {
        when(comunidadeRepository.existePorNome("Xadrez")).thenReturn(true);

        ApiException erro = assertThrows(ApiException.class,
                () -> service.criarComunidadeAberta(USUARIO_ID, "Xadrez", null));

        assertEquals("COMUNIDADE_NOME_EM_USO", erro.getCode());
        verify(comunidadeRepository, never()).persist(any(Comunidade.class));
    }

    @Test
    void ingressaEmComunidadeAbertaComSucesso() {
        Comunidade comunidade = comunidadeAberta();
        when(comunidadeRepository.findByIdOptional(1L)).thenReturn(Optional.of(comunidade));
        when(comunidadeMembroRepository.existeAssociacao(comunidade, USUARIO_ID)).thenReturn(false);

        service.ingressar(USUARIO_ID, 1L);

        ArgumentCaptor<ComunidadeMembro> captor = ArgumentCaptor.forClass(ComunidadeMembro.class);
        verify(comunidadeMembroRepository).persist(captor.capture());
        assertEquals(PapelMembro.MEMBRO, captor.getValue().papelNaComunidade);
    }

    @Test
    void rejeitaIngressoDuplicado() {
        Comunidade comunidade = comunidadeAberta();
        when(comunidadeRepository.findByIdOptional(1L)).thenReturn(Optional.of(comunidade));
        when(comunidadeMembroRepository.existeAssociacao(comunidade, USUARIO_ID)).thenReturn(true);

        ApiException erro = assertThrows(ApiException.class, () -> service.ingressar(USUARIO_ID, 1L));

        assertEquals("JA_E_MEMBRO", erro.getCode());
    }

    @Test
    void rejeitaIngressoEmComunidadeDeCurso() {
        Comunidade comunidade = comunidadeAberta();
        comunidade.tipo = TipoComunidade.CURSO;
        when(comunidadeRepository.findByIdOptional(1L)).thenReturn(Optional.of(comunidade));

        ApiException erro = assertThrows(ApiException.class, () -> service.ingressar(USUARIO_ID, 1L));

        assertEquals("COMUNIDADE_TIPO_INVALIDO", erro.getCode());
    }

    @Test
    void rejeitaIngressoEmComunidadeInexistente() {
        when(comunidadeRepository.findByIdOptional(99L)).thenReturn(Optional.empty());

        ApiException erro = assertThrows(ApiException.class, () -> service.ingressar(USUARIO_ID, 99L));

        assertEquals("COMUNIDADE_NAO_ENCONTRADA", erro.getCode());
    }

    @Test
    void sairRemoveAssociacao() {
        Comunidade comunidade = comunidadeAberta();
        when(comunidadeRepository.findByIdOptional(1L)).thenReturn(Optional.of(comunidade));

        service.sair(USUARIO_ID, 1L);

        verify(comunidadeMembroRepository).removerAssociacao(comunidade, USUARIO_ID);
    }

    @Test
    void listarDelegaParaRepositoryEMontaPageResponse() {
        Comunidade comunidade = comunidadeAberta();
        when(comunidadeRepository.listar(TipoComunidade.ABERTA, "xa", 0, 20)).thenReturn(List.of(comunidade));
        when(comunidadeRepository.contar(TipoComunidade.ABERTA, "xa")).thenReturn(1L);

        PageResponse<Comunidade> resposta = service.listar(TipoComunidade.ABERTA, "xa", 0, 20);

        assertEquals(1, resposta.content().size());
        assertEquals(1L, resposta.totalElements());
        assertEquals(1, resposta.totalPages());
    }

    @Test
    void souMembroConsultaORepository() {
        Comunidade comunidade = comunidadeAberta();
        when(comunidadeMembroRepository.existeAssociacao(comunidade, USUARIO_ID)).thenReturn(true);

        assertTrue(service.souMembro(comunidade, USUARIO_ID));
    }

    @Test
    void minhasComunidadesExtraiComunidadeDeCadaAssociacao() {
        Comunidade comunidade = comunidadeAberta();
        ComunidadeMembro membro = new ComunidadeMembro();
        membro.comunidade = comunidade;
        membro.usuarioId = USUARIO_ID;
        when(comunidadeMembroRepository.listarPorUsuario(USUARIO_ID)).thenReturn(List.of(membro));

        List<Comunidade> resultado = service.minhasComunidades(USUARIO_ID);

        assertEquals(1, resultado.size());
        assertEquals(comunidade, resultado.get(0));
    }

    private Comunidade comunidadeAberta() {
        Comunidade comunidade = new Comunidade();
        comunidade.id = 1L;
        comunidade.nome = "Xadrez";
        comunidade.tipo = TipoComunidade.ABERTA;
        return comunidade;
    }
}
