package br.edu.unicatolica.pacext.midia.web;

import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.midia.FinalidadeArquivo;
import br.edu.unicatolica.pacext.midia.aplicacao.ArquivoService;
import br.edu.unicatolica.pacext.midia.dominio.Arquivo;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

/** {@code POST /arquivos} (RF48–RF51): recebe anexo de postagem ou foto de perfil. */
@Path("/arquivos")
public class ArquivoResource {

    @Inject
    ArquivoService arquivoService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /**
     * O {@code Content-Type} da parte {@code arquivo} é ignorado: o formato é decidido pelo
     * conteúdo, no {@link ArquivoService}. O nome original volta como veio.
     */
    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response enviar(@RestForm("finalidade") String finalidade, @RestForm("arquivo") FileUpload arquivo) {
        FinalidadeArquivo finalidadeArquivo = finalidade(finalidade);
        Arquivo enviado = arquivoService.enviar(usuarioAutenticado.id(), finalidadeArquivo,
                arquivo == null ? null : nomeOriginal(arquivo.fileName()), conteudo(arquivo));
        return Response.status(Response.Status.CREATED).entity(ArquivoResponse.de(enviado)).build();
    }

    /**
     * O navegador escreve aspas do nome do arquivo como {@code %22} no cabeçalho do multipart
     * (HTML, "multipart/form-data encoding algorithm"), e o servidor entrega o texto cru.
     * Desfaz só esse escape para o nome voltar como o usuário o vê.
     */
    static String nomeOriginal(String noCabecalho) {
        return noCabecalho == null ? null : noCabecalho.replace("%22", "\"");
    }

    private static FinalidadeArquivo finalidade(String valor) {
        if (valor == null) {
            throw ArquivoService.finalidadeInvalida();
        }
        try {
            return FinalidadeArquivo.valueOf(valor.strip());
        } catch (IllegalArgumentException e) {
            throw ArquivoService.finalidadeInvalida();
        }
    }

    private static byte[] conteudo(FileUpload arquivo) {
        if (arquivo == null || arquivo.uploadedFile() == null) {
            return null;
        }
        try {
            return Files.readAllBytes(arquivo.uploadedFile());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
