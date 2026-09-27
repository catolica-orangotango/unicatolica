package br.edu.unicatolica.pacext;

import static org.junit.jupiter.api.Assertions.fail;

import com.tngtech.archunit.core.domain.Dependency;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Regras de dependência entre módulos, verificadas no CI (ver
 * docs/decisoes/2026-09-24-reestruturacao.md e 2026-09-24-identidade-desacoplada.md).
 *
 * <p>Nomes são relativos a {@code br.edu.unicatolica.pacext}: o primeiro segmento é o
 * módulo (ou o transversal), o resto é o pacote interno. Ex.: {@code identidade.web.AuthResource}.</p>
 */
class ArquiteturaTest {

    private static final String RAIZ = "br.edu.unicatolica.pacext.";

    /** Pacote transversal: código que todos usam e que não pertence a nenhum módulo. */
    private static final String TRANSVERSAL = "compartilhado";

    /** Módulo que só pode depender do transversal (decisão identidade-desacoplada). */
    private static final String FOLHA = "identidade";

    private static JavaClasses classes;

    @BeforeAll
    static void importar() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("br.edu.unicatolica.pacext");
    }

    /** Regra 1: outro módulo (ou o transversal) só importa o que está na raiz do módulo. */
    @Test
    void raizDoModuloEApiPublica() {
        verificar("raiz-e-api-publica", (origem, alvo) -> {
            String moduloAlvo = modulo(alvo);
            return !moduloAlvo.equals(TRANSVERSAL)
                    && !moduloAlvo.equals(modulo(origem))
                    && alvo.substring(moduloAlvo.length() + 1).contains(".");
        });
    }

    /** Regra 2: o Resource só chama o Service, nunca o Repository. */
    @Test
    void resourceSoChamaService() {
        verificar("resource-so-chama-service",
                (origem, alvo) -> origem.endsWith("Resource") && alvo.endsWith("Repository"));
    }

    /** Regra 4: o transversal não importa nenhum módulo; declara uma interface que o módulo implementa. */
    @Test
    void transversalNaoImportaModulo() {
        verificar("transversal-nao-importa-modulo",
                (origem, alvo) -> modulo(origem).equals(TRANSVERSAL) && !modulo(alvo).equals(TRANSVERSAL));
    }

    /** Identidade depende só do transversal; os outros módulos falam com ela pela API pública. */
    @Test
    void identidadeEFolha() {
        verificar("identidade-e-folha", (origem, alvo) -> modulo(origem).equals(FOLHA)
                && !modulo(alvo).equals(FOLHA)
                && !modulo(alvo).equals(TRANSVERSAL));
    }

    private static void verificar(String regra, BiPredicate<String, String> viola) {
        Set<String> violacoes = new TreeSet<>();
        for (String[] dep : dependencias()) {
            String origem = dep[0];
            String alvo = dep[1];
            if (viola.test(origem, alvo)) {
                violacoes.add(origem + " -> " + alvo);
            }
        }
        if (!violacoes.isEmpty()) {
            fail("Regra '" + regra + "' violada (ver docs/como-funciona.md, seção 4):\n  "
                    + String.join("\n  ", violacoes));
        }
    }

    /** Pares {origem, alvo} entre classes do projeto, com classes internas reduzidas à de topo. */
    private static Set<String[]> dependencias() {
        Set<String> pares = new TreeSet<>();
        for (JavaClass classe : classes) {
            for (Dependency dep : classe.getDirectDependenciesFromSelf()) {
                String origem = relativo(dep.getOriginClass());
                String alvo = relativo(dep.getTargetClass().getBaseComponentType());
                if (origem != null && alvo != null && !origem.equals(alvo)) {
                    pares.add(origem + " " + alvo);
                }
            }
        }
        return pares.stream().map(p -> p.split(" ")).collect(Collectors.toSet());
    }

    private static String relativo(JavaClass classe) {
        String nome = classe.getName();
        if (!nome.startsWith(RAIZ)) {
            return null;
        }
        int interna = nome.indexOf('$');
        return (interna < 0 ? nome : nome.substring(0, interna)).substring(RAIZ.length());
    }

    private static String modulo(String relativo) {
        int ponto = relativo.indexOf('.');
        return ponto < 0 ? relativo : relativo.substring(0, ponto);
    }
}
