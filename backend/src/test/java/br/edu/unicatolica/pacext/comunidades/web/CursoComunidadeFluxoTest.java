package br.edu.unicatolica.pacext.comunidades.web;

import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste.Sessao;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova pelo HTTP real a ligação curso -> comunidade de curso (KAN-44, Story 2.1): cadastrar o
 * curso cria a comunidade, renomear renomeia, o auto-join segue o curso renomeado e desativar
 * não tira ninguém da comunidade nem do perfil.
 */
@QuarkusTest
class CursoComunidadeFluxoTest {

    @Inject
    UsuarioDeTeste usuarioDeTeste;

    private Sessao admin;
    private String nome;

    @BeforeEach
    void preparar() {
        admin = usuarioDeTeste.comPerfil("ADMINISTRADOR");
        nome = "Curso Teste " + UUID.randomUUID();
    }

    @Test
    void cadastrarCursoCriaAComunidadeDeCursoEOAlunoQueEscolheEleEntraNela() {
        cadastrarCurso(nome);

        Integer comunidadeId = idDaComunidadeDeCurso(nome);
        Sessao aluno = usuarioDeTeste.novo(nome);

        aluno.autenticado().when().get("/comunidades/minhas")
                .then().statusCode(200)
                .body("id", hasItem(comunidadeId));
        aluno.autenticado().when().get("/comunidades/{id}", comunidadeId)
                .then().statusCode(200)
                .body("tipo", equalTo("CURSO"))
                .body("souMembro", equalTo(true));
    }

    @Test
    void renomearOCursoRenomeiaAComunidadeEOAutoJoinContinuaFuncionando() {
        Integer cursoId = cadastrarCurso(nome);
        Integer comunidadeId = idDaComunidadeDeCurso(nome);
        Sessao aluno = usuarioDeTeste.novo(nome);

        String novoNome = nome + " 2";
        admin.autenticado().contentType(JSON).body(Map.of("nome", novoNome, "ativo", true))
                .when().put("/cursos/{id}", cursoId)
                .then().statusCode(200);

        aluno.autenticado().when().get("/comunidades/{id}", comunidadeId)
                .then().statusCode(200)
                .body("nome", equalTo(novoNome))
                .body("souMembro", equalTo(true));
        aluno.autenticado().when().get("/usuarios/me")
                .then().statusCode(200)
                .body("curso", equalTo(novoNome));

        Sessao novoAluno = usuarioDeTeste.novo(novoNome);
        novoAluno.autenticado().when().get("/comunidades/minhas")
                .then().body("id", hasItem(comunidadeId));
    }

    @Test
    void desativarOCursoNaoMexeNaComunidadeNemNoPerfilDeQuemJaOTem() {
        Integer cursoId = cadastrarCurso(nome);
        Integer comunidadeId = idDaComunidadeDeCurso(nome);
        Sessao aluno = usuarioDeTeste.novo(nome);

        admin.autenticado().contentType(JSON).body(Map.of("nome", nome, "ativo", false))
                .when().put("/cursos/{id}", cursoId)
                .then().statusCode(200);

        aluno.autenticado().when().get("/usuarios/me")
                .then().statusCode(200)
                .body("curso", equalTo(nome));
        aluno.autenticado().when().get("/comunidades/minhas")
                .then().body("id", hasItem(comunidadeId));
        aluno.autenticado().when().get("/comunidades/{id}", comunidadeId)
                .then().statusCode(200)
                .body("souMembro", equalTo(true));
    }

    @Test
    void nomeUsadoPorOutraComunidadeDa409ENaoCriaOCurso() {
        Sessao dono = usuarioDeTeste.novo("Administração");
        dono.autenticado().contentType(JSON).body(Map.of("nome", nome))
                .when().post("/comunidades")
                .then().statusCode(201);

        admin.autenticado().contentType(JSON).body(Map.of("nome", nome))
                .when().post("/cursos")
                .then().statusCode(409)
                .body("error.code", equalTo("COMUNIDADE_NOME_EM_USO"));

        // O observer roda na transação do cadastro: o 409 desfaz o curso inteiro.
        admin.autenticado().when().get("/admin/cursos")
                .then().statusCode(200)
                .body("nome", not(hasItem(nome)));
    }

    @Test
    void recadastrarONomeDeUmCursoJaCadastradoDa409() {
        cadastrarCurso(nome);

        admin.autenticado().contentType(JSON).body(Map.of("nome", nome))
                .when().post("/cursos")
                .then().statusCode(409)
                .body("error.code", equalTo("CURSO_NOME_EM_USO"));
    }

    private Integer cadastrarCurso(String nomeDoCurso) {
        return admin.autenticado().contentType(JSON).body(Map.of("nome", nomeDoCurso))
                .when().post("/cursos")
                .then().statusCode(201)
                .extract().path("id");
    }

    private Integer idDaComunidadeDeCurso(String nomeDoCurso) {
        return admin.autenticado()
                .queryParam("tipo", "CURSO").queryParam("nome", nomeDoCurso)
                .when().get("/comunidades")
                .then().statusCode(200)
                .body("totalElements", equalTo(1))
                .extract().path("content[0].id");
    }
}
