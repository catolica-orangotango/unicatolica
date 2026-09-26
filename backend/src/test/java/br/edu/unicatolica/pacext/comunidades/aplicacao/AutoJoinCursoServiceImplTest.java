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

/** Testa {@link AutoJoinCursoServiceImpl} isoladamente com Mockito — critérios da Story 2.3 (RF24.1). */
class AutoJoinCursoServiceImplTest {

    private static final Long USUARIO_ID = 42L;

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

    private Comunidade comunidadeCurso(String nome) {
        Comunidade comunidade = new Comunidade();
        comunidade.id = 1L;
        comunidade.nome = nome;
        comunidade.tipo = TipoComunidade.CURSO;
        return comunidade;
    }

    @Test
    void associaAoDefinirCursoPelaPrimeiraVez() {
        Comunidade comunidade = comunidadeCurso("Engenharia de Software");
        when(comunidadeRepository.buscarPorTipoENome(TipoComunidade.CURSO, "Engenharia de Software"))
                .thenReturn(Optional.of(comunidade));
        when(comunidadeMembroRepository.existeAssociacao(comunidade, USUARIO_ID)).thenReturn(false);

        service.sincronizarCursoDoAluno(USUARIO_ID, null, "Engenharia de Software");

        ArgumentCaptor<ComunidadeMembro> captor = ArgumentCaptor.forClass(ComunidadeMembro.class);
        verify(comunidadeMembroRepository).persist(captor.capture());
        assertEquals(comunidade, captor.getValue().comunidade);
        assertEquals(USUARIO_ID, captor.getValue().usuarioId);
        assertEquals(PapelMembro.MEMBRO, captor.getValue().papelNaComunidade);
    }

    @Test
    void naoDuplicaAssociacaoQuandoJaEMembro() {
        Comunidade comunidade = comunidadeCurso("Engenharia de Software");
        when(comunidadeRepository.buscarPorTipoENome(TipoComunidade.CURSO, "Engenharia de Software"))
                .thenReturn(Optional.of(comunidade));
        when(comunidadeMembroRepository.existeAssociacao(comunidade, USUARIO_ID)).thenReturn(true);

        service.sincronizarCursoDoAluno(USUARIO_ID, null, "Engenharia de Software");

        verify(comunidadeMembroRepository, never()).persist(any(ComunidadeMembro.class));
    }

    @Test
    void naoFalhaQuandoComunidadeDeCursoAindaNaoExiste() {
        when(comunidadeRepository.buscarPorTipoENome(TipoComunidade.CURSO, "Curso Inexistente"))
                .thenReturn(Optional.empty());

        service.sincronizarCursoDoAluno(USUARIO_ID, null, "Curso Inexistente");

        verify(comunidadeMembroRepository, never()).persist(any(ComunidadeMembro.class));
    }

    @Test
    void trocaDeComunidadeAoAlterarCurso() {
        Comunidade cursoAntigo = comunidadeCurso("Administração");
        Comunidade cursoNovo = comunidadeCurso("Engenharia de Software");
        when(comunidadeRepository.buscarPorTipoENome(TipoComunidade.CURSO, "Administração"))
                .thenReturn(Optional.of(cursoAntigo));
        when(comunidadeRepository.buscarPorTipoENome(TipoComunidade.CURSO, "Engenharia de Software"))
                .thenReturn(Optional.of(cursoNovo));
        when(comunidadeMembroRepository.existeAssociacao(cursoNovo, USUARIO_ID)).thenReturn(false);

        service.sincronizarCursoDoAluno(USUARIO_ID, "Administração", "Engenharia de Software");

        verify(comunidadeMembroRepository).removerAssociacao(cursoAntigo, USUARIO_ID);
        verify(comunidadeMembroRepository).persist(any(ComunidadeMembro.class));
    }

    @Test
    void naoFazNadaQuandoCursoNaoMudou() {
        service.sincronizarCursoDoAluno(USUARIO_ID, "Engenharia de Software", "Engenharia de Software");

        verify(comunidadeRepository, never()).buscarPorTipoENome(any(), any());
        verify(comunidadeMembroRepository, never()).persist(any(ComunidadeMembro.class));
        verify(comunidadeMembroRepository, never()).removerAssociacao(any(), anyLong());
    }
}
