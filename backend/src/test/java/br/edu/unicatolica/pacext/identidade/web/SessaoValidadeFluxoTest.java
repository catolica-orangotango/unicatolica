package br.edu.unicatolica.pacext.identidade.web;

import static org.junit.jupiter.api.Assertions.assertEquals;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * KAN-78: o token devolvido por {@code POST /auth/login} vale as 8 horas configuradas em
 * {@code identidade.sessao.validade-horas}. Antes, sem {@code expiresIn}, o SmallRye
 * emitia o token com validade de 5 minutos e a sessão caía no meio do uso.
 */
@QuarkusTest
class SessaoValidadeFluxoTest {

    @Inject
    UsuarioDeTeste usuarioDeTeste;

    @Test
    void tokenDoLoginValeOitoHoras() throws Exception {
        String token = usuarioDeTeste.novo("Administração").token();

        String payloadJson = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]));
        Map<?, ?> payload = new ObjectMapper().readValue(payloadJson, Map.class);
        long emitidoEm = ((Number) payload.get("iat")).longValue();
        long expiraEm = ((Number) payload.get("exp")).longValue();
        assertEquals(8 * 60 * 60, expiraEm - emitidoEm);
    }
}
