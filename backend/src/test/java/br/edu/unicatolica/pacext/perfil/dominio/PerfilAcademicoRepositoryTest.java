package br.edu.unicatolica.pacext.perfil.dominio;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** Prova contra o Postgres real que a migration {@code perfil-001} e a busca por usuário funcionam. */
@QuarkusTest
class PerfilAcademicoRepositoryTest {

    // Ids fora da faixa dos seeds: sem FK (AD-3), a tabela aceita qualquer usuario_id.
    private static final Long USUARIO = 700_001L;

    @Inject
    PerfilAcademicoRepository repository;

    @Inject
    EntityManager entityManager;

    @Test
    @TestTransaction
    void buscarPorUsuarioIdTrazPeriodoEInteresses() {
        persistir(USUARIO, (short) 3, Set.of("Java", "Robótica"));
        entityManager.clear();

        PerfilAcademico perfil = repository.buscarPorUsuarioId(USUARIO).orElseThrow();

        assertEquals((short) 3, perfil.periodo);
        assertEquals(Set.of("Java", "Robótica"), perfil.interesses);
    }

    @Test
    @TestTransaction
    void buscarPorUsuarioIdSemPerfilDevolveVazio() {
        assertTrue(repository.buscarPorUsuarioId(USUARIO).isEmpty());
    }

    @Test
    @TestTransaction
    void bancoRejeitaSegundoPerfilDoMesmoUsuario() {
        persistir(USUARIO, (short) 1, Set.of());

        assertThrows(PersistenceException.class, () -> persistir(USUARIO, (short) 2, Set.of()));
    }

    @Test
    @TestTransaction
    void bancoRejeitaPeriodoForaDaFaixa() {
        assertThrows(PersistenceException.class, () -> persistir(USUARIO, (short) 13, Set.of()));
    }

    @Test
    @TestTransaction
    void bancoRejeitaInteresseEmBranco() {
        assertThrows(PersistenceException.class, () -> persistir(USUARIO, (short) 1, Set.of("  ")));
    }

    private PerfilAcademico persistir(Long usuarioId, short periodo, Set<String> interesses) {
        PerfilAcademico perfil = new PerfilAcademico();
        perfil.usuarioId = usuarioId;
        perfil.periodo = periodo;
        perfil.interesses.addAll(interesses);
        perfil.criadoEm = Instant.now();
        repository.persistAndFlush(perfil);
        return perfil;
    }
}
