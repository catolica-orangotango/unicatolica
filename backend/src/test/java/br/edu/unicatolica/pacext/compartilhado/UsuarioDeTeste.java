package br.edu.unicatolica.pacext.compartilhado;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;

import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.restassured.specification.RequestSpecification;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Instant;
import java.util.Map;

/**
 * Cria, para {@code @QuarkusTest}, um aluno próprio do teste: cadastra pelo HTTP real (o
 * auto-join no curso acontece), confirma o e-mail direto no banco e faz login.
 *
 * <p>Cada chamada usa um e-mail único — nunca o {@code aluno.teste} do seed, porque logout
 * e troca de curso invalidam a sessão de quem estiver usando o mesmo usuário.</p>
 */
@ApplicationScoped
public class UsuarioDeTeste {

    public static final String SENHA = "Senha123!";

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    PasswordHasher passwordHasher;

    public Sessao novo(String nomeDoCurso) {
        String email = "teste." + System.nanoTime() + "@catolicasc.edu.br";

        Integer id = given().contentType(JSON)
                .body(Map.of("nome", "Aluno de Teste", "email", email, "senha", SENHA,
                        "cursoId", idDoCurso(nomeDoCurso), "dataNascimento", "2000-01-01"))
                .when().post("/auth/registro")
                .then().statusCode(201)
                .extract().path("id");

        QuarkusTransaction.requiringNew().run(() ->
                usuarioRepository.buscarPorEmail(email).orElseThrow().emailConfirmado = true);

        String token = given().contentType(JSON)
                .body(Map.of("email", email, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");

        return new Sessao(id.longValue(), email, token);
    }

    /**
     * Cria direto no banco um usuário com o perfil global pedido ({@code ADMINISTRADOR},
     * {@code MODERADOR}...), sem curso, e faz login. Para testar rotas restritas por perfil.
     */
    public Sessao comPerfil(String perfil) {
        String email = "perfil." + System.nanoTime() + "@catolicasc.edu.br";
        Long id = QuarkusTransaction.requiringNew().call(() -> {
            Usuario usuario = new Usuario();
            usuario.nome = "Usuário " + perfil;
            usuario.email = email;
            usuario.senhaHash = passwordHasher.gerarHash(SENHA);
            usuario.perfil = perfil;
            usuario.emailConfirmado = true;
            usuario.criadoEm = Instant.now();
            usuarioRepository.persist(usuario);
            return usuario.id;
        });

        String token = given().contentType(JSON)
                .body(Map.of("email", email, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");

        return new Sessao(id, email, token);
    }

    public static Integer idDoCurso(String nome) {
        return given().when().get("/cursos")
                .then().statusCode(200)
                .extract().path("find { it.nome == '" + nome + "' }.id");
    }

    public record Sessao(long id, String email, String token) {

        public RequestSpecification autenticado() {
            return given().header("Authorization", "Bearer " + token);
        }
    }
}
