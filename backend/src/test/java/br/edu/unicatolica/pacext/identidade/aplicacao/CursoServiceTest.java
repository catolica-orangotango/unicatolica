package br.edu.unicatolica.pacext.identidade.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.identidade.dominio.Curso;
import br.edu.unicatolica.pacext.identidade.dominio.CursoRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testa {@link CursoService} isoladamente com Mockito. */
class CursoServiceTest {

    private CursoService service;

    @BeforeEach
    void setUp() {
        service = new CursoService();
        service.cursoRepository = mock(CursoRepository.class);
    }

    @Test
    void devolveCursoAtivo() {
        Curso curso = new Curso();
        when(service.cursoRepository.buscarAtivo(7L)).thenReturn(Optional.of(curso));

        assertSame(curso, service.buscarAtivoOuFalhar(7L));
    }

    @Test
    void cursoInexistenteOuInativoDa422() {
        when(service.cursoRepository.buscarAtivo(7L)).thenReturn(Optional.empty());

        ApiException erro = assertThrows(ApiException.class, () -> service.buscarAtivoOuFalhar(7L));

        assertEquals(422, erro.getStatus());
        assertEquals("CURSO_INVALIDO", erro.getCode());
        assertEquals("cursoId", erro.getDetails());
    }
}
