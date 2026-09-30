package br.edu.unicatolica.pacext.identidade.dominio;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.PersistenceException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/** Prova contra o Postgres real a migration {@code identidade-005} e o filtro de cursos ativos. */
@QuarkusTest
class CursoRepositoryTest {

    @Inject
    CursoRepository repository;

    @Test
    @TestTransaction
    void cursoInativoSomeDaListaENaoEAceito() {
        Curso inativo = persistir("Curso Desativado", false);

        assertFalse(repository.listarAtivos().stream().anyMatch(c -> c.id.equals(inativo.id)));
        assertTrue(repository.buscarAtivo(inativo.id).isEmpty());
    }

    @Test
    @TestTransaction
    void bancoRejeitaNomeRepetidoSemDiferencaDeMaiusculas() {
        assertThrows(PersistenceException.class, () -> persistir("ENGENHARIA DE SOFTWARE", true));
    }

    private Curso persistir(String nome, boolean ativo) {
        Curso curso = new Curso();
        curso.nome = nome;
        curso.ativo = ativo;
        curso.criadoEm = Instant.now();
        repository.persistAndFlush(curso);
        return curso;
    }
}
