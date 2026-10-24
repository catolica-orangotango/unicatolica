package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.comunidades.dominio.Comunidade;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembro;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembroRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.PapelMembro;
import br.edu.unicatolica.pacext.comunidades.dominio.TipoComunidade;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Testa {@link AutoJoinCursoServiceImpl} isoladamente com Mockito — critérios da Story 2.3
 * (RF24.1). Desde o KAN-44 a comunidade de curso é achada pelo id do curso, não pelo nome.
 */
class AutoJoinCursoServiceImplTest {

    private static final Long USUARIO_ID = 42L;
    private static final Long CURSO_ADMINISTRACAO = 1L;
    private static final Long CURSO_ENGENHARIA = 14L;

    private AutoJoinCursoServiceImpl service;
    private ComunidadeRepository comunidadeRepository;
    private ComunidadeMembroRepository comunidadeMembroRepository;

    @BeforeEach
    void setUp() {
        service = new AutoJoinCursoServiceImpl();
        comunidadeRepository = mock(ComunidadeRepository.class);
        comunidadeMembroRepository = mock(ComunidadeMembroRepository.class);
        service.comunidadeRepository = comunidadeRepository;
        service.comunidadeMembroRepository = comunidadeMembroRepository;
    }

    private Comunidade comunidadeCurso(String nome, Long cursoId) {
        Comunidade comunidade = new Comunidade();
        comunidade.id = 1L;
        comunidade.nome = nome;
        comunidade.tipo = TipoComunidade.CURSO;
        comunidade.cursoId = cursoId;
        return comunidade;
    }

    @Test
    void associaAoDefinirCursoPelaPrimeiraVez() {
        Comunidade comunidade = comunidadeCurso("Engenharia de Software", CURSO_ENGENHARIA);
        when(comunidadeRepository.buscarAtivaPorCursoId(CURSO_ENGENHARIA)).thenReturn(Optional.of(comunidade));
        when(comunidadeMembroRepository.existeAssociacao(comunidade, USUARIO_ID)).thenReturn(false);

        service.sincronizarCursoDoAluno(USUARIO_ID, null, CURSO_ENGENHARIA);

        ArgumentCaptor<ComunidadeMembro> captor = ArgumentCaptor.forClass(ComunidadeMembro.class);
        verify(comunidadeMembroRepository).persist(captor.capture());
        assertEquals(comunidade, captor.getValue().comunidade);
        assertEquals(USUARIO_ID, captor.getValue().usuarioId);
        assertEquals(PapelMembro.MEMBRO, captor.getValue().papelNaComunidade);
    }

    @Test
    void naoDuplicaAssociacaoQuandoJaEMembro() {
        Comunidade comunidade = comunidadeCurso("Engenharia de Software", CURSO_ENGENHARIA);
        when(comunidadeRepository.buscarAtivaPorCursoId(CURSO_ENGENHARIA)).thenReturn(Optional.of(comunidade));
        when(comunidadeMembroRepository.existeAssociacao(comunidade, USUARIO_ID)).thenReturn(true);

        service.sincronizarCursoDoAluno(USUARIO_ID, null, CURSO_ENGENHARIA);

        verify(comunidadeMembroRepository, never()).persist(any(ComunidadeMembro.class));
    }

    @Test
    void naoFalhaQuandoCursoAindaNaoTemComunidade() {
        when(comunidadeRepository.buscarAtivaPorCursoId(999L)).thenReturn(Optional.empty());

        service.sincronizarCursoDoAluno(USUARIO_ID, null, 999L);

        verify(comunidadeMembroRepository, never()).persist(any(ComunidadeMembro.class));
    }

    @Test
    void trocaDeComunidadeAoAlterarCurso() {
        Comunidade cursoAntigo = comunidadeCurso("Administração", CURSO_ADMINISTRACAO);
        Comunidade cursoNovo = comunidadeCurso("Engenharia de Software", CURSO_ENGENHARIA);
        when(comunidadeRepository.buscarAtivaPorCursoId(CURSO_ADMINISTRACAO)).thenReturn(Optional.of(cursoAntigo));
        when(comunidadeRepository.buscarAtivaPorCursoId(CURSO_ENGENHARIA)).thenReturn(Optional.of(cursoNovo));
        when(comunidadeMembroRepository.existeAssociacao(cursoNovo, USUARIO_ID)).thenReturn(false);

        service.sincronizarCursoDoAluno(USUARIO_ID, CURSO_ADMINISTRACAO, CURSO_ENGENHARIA);

        verify(comunidadeMembroRepository).removerAssociacao(cursoAntigo, USUARIO_ID);
        verify(comunidadeMembroRepository).persist(any(ComunidadeMembro.class));
    }

    @Test
    void naoFazNadaQuandoCursoNaoMudou() {
        service.sincronizarCursoDoAluno(USUARIO_ID, CURSO_ENGENHARIA, CURSO_ENGENHARIA);

        verify(comunidadeRepository, never()).buscarAtivaPorCursoId(any());
        verify(comunidadeMembroRepository, never()).persist(any(ComunidadeMembro.class));
        verify(comunidadeMembroRepository, never()).removerAssociacao(any(), anyLong());
    }
}
