package br.edu.unicatolica.pacext.midia.web;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste.Sessao;
import br.edu.unicatolica.pacext.midia.FinalidadeArquivo;
import br.edu.unicatolica.pacext.midia.dominio.ArmazenamentoObjetos;
import br.edu.unicatolica.pacext.midia.dominio.Arquivo;
import br.edu.unicatolica.pacext.midia.dominio.ArquivoRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import io.restassured.config.HttpClientConfig;
import io.restassured.config.MultiPartConfig;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova pelo HTTP real (rest-assured, multipart) o contrato de {@code POST /arquivos}: caminho
 * feliz, 401 e cada código de erro do {@code openapi.yaml}. O S3 é o do Dev Services.
 */
@QuarkusTest
class ArquivoResourceTest {

    private static final String CURSO = "Administração";

    @Inject
    UsuarioDeTeste usuarioDeTeste;

    @Inject
    ArquivoRepository arquivoRepository;

    @Inject
    ArmazenamentoObjetos armazenamento;

    private Sessao aluno;

    @BeforeEach
    void criaAluno() {
        aluno = usuarioDeTeste.novo(CURSO);
    }

    @Test
    void pngValidoDa201EFicaNoBucketENoBanco() {
        byte[] png = png(1024);

        Integer id = enviar(aluno.autenticado(), "ANEXO_POSTAGEM", "foto.png", png)
                .then().statusCode(201)
                .body("id", notNullValue())
                .body("nome", equalTo("foto.png"))
                .body("tipo", equalTo("image/png"))
                .body("tamanho", equalTo(1024))
                .extract().path("id");

        Arquivo arquivo = QuarkusTransaction.requiringNew().call(() -> arquivoRepository.findById(id.longValue()));
        assertEquals(aluno.id(), arquivo.donoId);
        assertEquals(FinalidadeArquivo.ANEXO_POSTAGEM, arquivo.finalidade);
        assertFalse(arquivo.emUso);
        assertTrue(arquivo.chave.startsWith("arquivos/"));

        String url = armazenamento.urlAssinada(arquivo.chave, arquivo.nomeOriginal, Duration.ofMinutes(1));
        Response leitura = RestAssured.given().urlEncodingEnabled(false).when().get(url);
        assertEquals(200, leitura.statusCode());
        assertArrayEquals(png, leitura.asByteArray());
        assertTrue(leitura.header("Content-Disposition").contains("filename=\"foto.png\""),
                leitura.header("Content-Disposition"));
    }

    /**
     * Corpo montado à mão como o navegador monta um FormData (HTML, "multipart/form-data
     * encoding algorithm"): nome em UTF-8 cru e aspas como {@code %22}.
     */
    @Test
    void nomeComAspasAcentoECaminhoVoltaPreservado() {
        String nome = "relatório \"final\" ../x.pdf";
        String noCabecalho = nome.replace("\"", "%22");

        aluno.autenticado()
                .contentType("multipart/form-data; boundary=" + LIMITE)
                .body(multipartComoNavegador("ANEXO_POSTAGEM", noCabecalho, pdf(100)))
                .when().post("/arquivos")
                .then().statusCode(201)
                .body("nome", equalTo(nome))
                .body("tipo", equalTo("application/pdf"));
    }

    @Test
    void semTokenDa401() {
        enviar(given(), "ANEXO_POSTAGEM", "foto.png", png(10))
                .then().statusCode(401)
                .body("error.code", notNullValue());
    }

    @Test
    void semAParteArquivoDa400ArquivoObrigatorio() {
        aluno.autenticado()
                .multiPart("finalidade", "ANEXO_POSTAGEM")
                .when().post("/arquivos")
                .then().statusCode(400)
                .body("error.code", equalTo("ARQUIVO_OBRIGATORIO"));
    }

    @Test
    void gifDa400FormatoNaoSuportado() {
        byte[] gif = Arrays.copyOf("GIF89a".getBytes(StandardCharsets.US_ASCII), 64);

        enviar(aluno.autenticado(), "ANEXO_POSTAGEM", "x.gif", gif)
                .then().statusCode(400)
                .body("error.code", equalTo("FORMATO_NAO_SUPORTADO"));
    }

    @Test
    void pdfComoFotoDePerfilDa400FormatoNaoSuportado() {
        enviar(aluno.autenticado(), "FOTO_PERFIL", "x.pdf", pdf(100))
                .then().statusCode(400)
                .body("error.code", equalTo("FORMATO_NAO_SUPORTADO"));
    }

    @Test
    void imagemDe3MbDa400ArquivoMuitoGrande() {
        enviar(aluno.autenticado(), "ANEXO_POSTAGEM", "grande.png", png(3 * 1024 * 1024))
                .then().statusCode(400)
                .body("error.code", equalTo("ARQUIVO_MUITO_GRANDE"));
    }

    @Test
    void finalidadeDesconhecidaDa400FinalidadeInvalida() {
        enviar(aluno.autenticado(), "CAPA_DE_REVISTA", "foto.png", png(10))
                .then().statusCode(400)
                .body("error.code", equalTo("FINALIDADE_INVALIDA"));
    }

    @Test
    void semFinalidadeDa400FinalidadeInvalida() {
        aluno.autenticado()
                .multiPart("arquivo", "foto.png", png(10), "image/png")
                .when().post("/arquivos")
                .then().statusCode(400)
                .body("error.code", equalTo("FINALIDADE_INVALIDA"));
    }

    /**
     * Acima de {@code quarkus.http.limits.max-body-size} (6 MB): o corpo nem é lido. Com
     * {@code Expect: 100-continue} o cliente espera a resposta antes de mandar o corpo; sem
     * ele, o servidor responde e fecha a conexão no meio do envio.
     */
    @Test
    void corpoAcimaDoLimiteDoServidorRespondeNoEnvelope() {
        aluno.autenticado()
                .config(RestAssured.config().httpClient(
                        HttpClientConfig.httpClientConfig().setParam("http.protocol.expect-continue", true)))
                .header("Origin", "http://localhost:4200")
                .contentType("multipart/form-data; boundary=" + LIMITE)
                .body(multipartComoNavegador("ANEXO_POSTAGEM", "enorme.pdf", pdf(7 * 1024 * 1024)))
                .when().post("/arquivos")
                .then().statusCode(400)
                // Sem CORS o navegador do front não consegue ler o envelope.
                .header("Access-Control-Allow-Origin", "http://localhost:4200")
                .body("error.code", equalTo("ARQUIVO_MUITO_GRANDE"))
                .body("error.message", notNullValue());
    }

    private static Response enviar(RequestSpecification spec, String finalidade, String nome, byte[] conteudo) {
        return spec
                .config(RestAssured.config().multiPartConfig(MultiPartConfig.multiPartConfig().defaultCharset("UTF-8")))
                .multiPart("finalidade", finalidade)
                .multiPart("arquivo", nome, conteudo, "application/octet-stream")
                .when().post("/arquivos");
    }

    private static final String LIMITE = "----limiteDoTeste7MA4YWxkTrZu0gW";

    private static byte[] multipartComoNavegador(String finalidade, String nomeNoCabecalho, byte[] conteudo) {
        ByteArrayOutputStream corpo = new ByteArrayOutputStream();
        String partes = "--" + LIMITE + "\r\n"
                + "Content-Disposition: form-data; name=\"finalidade\"\r\n\r\n"
                + finalidade + "\r\n"
                + "--" + LIMITE + "\r\n"
                + "Content-Disposition: form-data; name=\"arquivo\"; filename=\"" + nomeNoCabecalho + "\"\r\n"
                + "Content-Type: application/pdf\r\n\r\n";
        corpo.writeBytes(partes.getBytes(StandardCharsets.UTF_8));
        corpo.writeBytes(conteudo);
        corpo.writeBytes(("\r\n--" + LIMITE + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return corpo.toByteArray();
    }

    private static byte[] png(int tamanho) {
        return Arrays.copyOf(new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, tamanho);
    }

    private static byte[] pdf(int tamanho) {
        return Arrays.copyOf("%PDF-1.7".getBytes(StandardCharsets.US_ASCII), tamanho);
    }
}
