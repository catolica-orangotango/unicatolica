package br.edu.unicatolica.pacext.comunidades;

import br.edu.unicatolica.pacext.comunidades.dominio.Comunidade;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembroRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeRepository;
import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
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

    /** Curso real da lista (o cadastro só aceita curso de GET /cursos); nenhum outro teste cadastra nele. */
    private static final String CURSO_QUE_FALHA = "Teologia";

    @Inject
    ComunidadeRepository comunidadeRepository;

    @Inject
    ComunidadeMembroRepository comunidadeMembroRepository;

    /** Id do curso que faz o observer de teste falhar; só é definido no teste que precisa da falha. */
    private static volatile Long cursoQueFalhaId;

    /** Observer só de teste: simula uma falha no auto-join para um curso específico. */
    @ApplicationScoped
    static class ObserverQueFalha {
        void aoCadastrar(@Observes UsuarioCadastrado evento) {
            if (evento.cursoId().equals(cursoQueFalhaId)) {
                throw new IllegalStateException("falha simulada no auto-join");
            }
        }
    }

    @Test
    void cadastroEntraNaComunidadeDoCurso() {
        Integer id = cadastrar(emailUnico(), "Administração")
                .then().statusCode(201)
                .extract().path("id");

        Comunidade comunidade = comunidadeRepository
                .buscarAtivaPorCursoId(UsuarioDeTeste.idDoCurso("Administração").longValue())
                .orElseThrow();
        assertTrue(comunidadeMembroRepository.existeAssociacao(comunidade, id.longValue()));
    }

    @Test
    void falhaNoAutoJoinDesfazOCadastro() {
        String email = emailUnico();
        cursoQueFalhaId = UsuarioDeTeste.idDoCurso(CURSO_QUE_FALHA).longValue();

        cadastrar(email, CURSO_QUE_FALHA).then().statusCode(500);

        // Se o usuário tivesse ficado gravado, o segundo cadastro daria 409 EMAIL_JA_CADASTRADO.
        cadastrar(email, "Administração").then().statusCode(201);
    }

    @Test
    void cursoForaDaListaDa422() {
        given().contentType(JSON)
                .body(Map.of("nome", "Aluno Teste", "email", emailUnico(), "senha", "Senha123!",
                        "cursoId", 999_999, "dataNascimento", "2000-01-01"))
                .when().post("/auth/registro")
                .then().statusCode(422)
                .body("error.code", org.hamcrest.Matchers.equalTo("CURSO_INVALIDO"));
    }

    private static io.restassured.response.Response cadastrar(String email, String nomeDoCurso) {
        return given().contentType(JSON)
                .body(Map.of("nome", "Aluno Teste", "email", email, "senha", "Senha123!",
                        "cursoId", UsuarioDeTeste.idDoCurso(nomeDoCurso), "dataNascimento", "2000-01-01"))
                .when().post("/auth/registro");
    }

    private static String emailUnico() {
        return "cadastro." + System.nanoTime() + "@catolicasc.edu.br";
    }
}
