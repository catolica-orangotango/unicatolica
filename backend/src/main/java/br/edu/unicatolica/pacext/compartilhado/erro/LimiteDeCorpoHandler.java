package br.edu.unicatolica.pacext.compartilhado.erro;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.netty.handler.codec.http.HttpHeaderNames;
import io.quarkus.runtime.configuration.MemorySize;
import io.quarkus.vertx.http.runtime.RouteConstants;
import io.vertx.core.http.HttpServerResponse;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Recusa no envelope padrão (AD-5) o corpo cujo {@code Content-Length} passa de
 * {@code quarkus.http.limits.max-body-size}. Sem isto, quem barra é a rota de limite de upload
 * do próprio Quarkus, que responde 413 sem corpo. Roda numa rota Vert.x logo antes daquela
 * ({@link RouteConstants#ROUTE_ORDER_UPLOAD_LIMIT}), porque nenhum filtro JAX-RS chega a ver
 * essa requisição. O corpo não é lido e a conexão é fechada, como faz o Quarkus: o cliente que
 * manda {@code Expect: 100-continue} recebe o envelope sem enviar o corpo.
 *
 * <p>Multipart é upload de arquivo: responde 400 {@code ARQUIVO_MUITO_GRANDE}, o código que o
 * contrato de {@code POST /arquivos} já define; os demais, 400 {@code CORPO_MUITO_GRANDE}.</p>
 */
@ApplicationScoped
public class LimiteDeCorpoHandler {

    @ConfigProperty(name = "quarkus.http.limits.max-body-size")
    MemorySize limite;

    @Inject
    ObjectMapper objectMapper;

    void registrar(@Observes Router router) {
        router.route().order(RouteConstants.ROUTE_ORDER_UPLOAD_LIMIT - 1).handler(this::verificar);
    }

    void verificar(RoutingContext contexto) {
        long declarado = tamanhoDeclarado(contexto.request().getHeader(HttpHeaderNames.CONTENT_LENGTH));
        if (declarado <= limite.asLongValue()) {
            contexto.next();
            return;
        }
        String tipo = contexto.request().getHeader(HttpHeaderNames.CONTENT_TYPE);
        boolean upload = tipo != null && tipo.toLowerCase().startsWith("multipart/");
        String maximo = (limite.asLongValue() / (1024 * 1024)) + " MB";
        ErroResponse corpo = upload
                ? ErroResponse.of("ARQUIVO_MUITO_GRANDE", "O envio pode ter até " + maximo + ".", "arquivo")
                : ErroResponse.of("CORPO_MUITO_GRANDE", "A requisição pode ter até " + maximo + ".", null);

        HttpServerResponse resposta = contexto.response();
        resposta.setStatusCode(Response.Status.BAD_REQUEST.getStatusCode());
        resposta.putHeader(HttpHeaderNames.CONTENT_TYPE, MediaType.APPLICATION_JSON);
        resposta.putHeader(HttpHeaderNames.CONNECTION, "close");
        resposta.endHandler(fim -> contexto.request().connection().close());
        resposta.end(json(corpo));
    }

    private String json(ErroResponse corpo) {
        try {
            return objectMapper.writeValueAsString(corpo);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private static long tamanhoDeclarado(String contentLength) {
        if (contentLength == null) {
            return -1;
        }
        try {
            return Long.parseLong(contentLength.strip());
        } catch (NumberFormatException e) {
            return -1;
        }
    }
}
