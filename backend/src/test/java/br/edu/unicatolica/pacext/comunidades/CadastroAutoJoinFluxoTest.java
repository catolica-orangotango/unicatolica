package br.edu.unicatolica.pacext.comunidades;

import br.edu.unicatolica.pacext.comunidades.dominio.Comunidade;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembroRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.TipoComunidade;
import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.edu.unicatolica.pacext.identidade.UsuarioCadastrado;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Prova sobre o pipeline real que o cadastro (Identidade) coloca o aluno na comunidade do
 * curso (Comunidades) pelo evento {@link UsuarioCadastrado}, e que o observer roda na
 * mesma transação: se ele falha, o cadastro é desfeito.
 */
@QuarkusTest
class CadastroAutoJoinFluxoTest {

    private static final String CURSO_QUE_FALHA = "Curso que derruba o auto-join (teste)";

    @Inject
    ComunidadeRepository comunidadeRepository;

    @Inject
    ComunidadeMembroRepository comunidadeMembroRepository;

    /** Observer só de teste: simula uma falha no auto-join para um curso específico. */
    @ApplicationScoped
    static class ObserverQueFalha {
        void aoCadastrar(@Observes UsuarioCadastrado evento) {
            if (CURSO_QUE_FALHA.equals(evento.curso())) {
                throw new IllegalStateException("falha simulada no auto-join");
            }
        }
    }

    @Test
    void cadastroEntraNaComunidadeDoCurso() {
        Integer id = cadastrar(emailUnico(), "Administração")
                .then().statusCode(201)
                .extract().path("id");

        Comunidade comunidade = comunidadeRepository.buscarPorTipoENome(TipoComunidade.CURSO, "Administração")
                .orElseThrow();
        assertTrue(comunidadeMembroRepository.existeAssociacao(comunidade, id.longValue()));
    }

    @Test
    void falhaNoAutoJoinDesfazOCadastro() {
        String email = emailUnico();

        cadastrar(email, CURSO_QUE_FALHA).then().statusCode(500);

        // Se o usuário tivesse ficado gravado, o segundo cadastro daria 409 EMAIL_JA_CADASTRADO.
        cadastrar(email, "Administração").then().statusCode(201);
    }

    private static io.restassured.response.Response cadastrar(String email, String curso) {
        return given().contentType(JSON)
                .body(Map.of("nome", "Aluno Teste", "email", email, "senha", "Senha123!",
                        "curso", curso, "dataNascimento", "2000-01-01"))
                .when().post("/auth/registro");
    }

    private static String emailUnico() {
        return "cadastro." + System.nanoTime() + "@catolicasc.edu.br";
    }
}
