package br.edu.unicatolica.pacext.enquetes.dominio;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Guarda do anonimato do voto (RF57.1). {@code enquete_voto} só pode ter o id e a opção escolhida: uma
 * coluna de identidade, de data/hora ou de agrupamento por voto permitiria cruzar com
 * {@code enquete_participacao} e descobrir em quem cada pessoa votou. Se este teste quebrar, o problema
 * é a coluna nova, não o teste.
 */
@QuarkusTest
class EnqueteAnonimatoTest {

    @Inject
    EntityManager entityManager;

    @SuppressWarnings("unchecked")
    private Set<String> colunasDe(String tabela) {
        List<String> colunas = entityManager
                .createNativeQuery("select column_name from information_schema.columns where table_name = :t")
                .setParameter("t", tabela)
                .getResultList();
        return colunas.stream().collect(Collectors.toSet());
    }

    @Test
    @Transactional
    void enqueteVotoGuardaSoAOpcaoEscolhida() {
        assertEquals(Set.of("id", "opcao_id"), colunasDe("enquete_voto"));
    }

    @Test
    @Transactional
    void enqueteParticipacaoNaoGuardaAOpcaoEscolhida() {
        Set<String> colunas = colunasDe("enquete_participacao");

        assertEquals(Set.of("id", "enquete_id", "usuario_id"), colunas);
        assertFalse(colunas.contains("opcao_id"));
    }

    @Test
    void entidadeDeVotoNaoDeclaraIdentidadeNemTempo() {
        // O Hibernate acrescenta campos "$$_hibernate_*" à entidade ao compilar; não são dados.
        Set<String> campos = Arrays.stream(EnqueteVoto.class.getDeclaredFields())
                .map(Field::getName)
                .filter(nome -> !nome.startsWith("$$"))
                .collect(Collectors.toSet());

        assertEquals(Set.of("id", "opcaoId"), campos);
    }
}
