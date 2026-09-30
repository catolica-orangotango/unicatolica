package br.edu.unicatolica.pacext.compartilhado.erro;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.identidade.web.CadastroRequest;
import br.edu.unicatolica.pacext.identidade.web.CadastroResource;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.executable.ExecutableValidator;
import jakarta.ws.rs.core.Response;
import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.Iterator;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Defeito D6: a resposta de erro de validação vazava o caminho interno do parâmetro do
 * método JAX-RS (ex.: "registrar.request.email") em vez de só o nome do campo que o
 * usuário reconhece ("email"). Reproduz o cenário via validação de método real (o mesmo
 * mecanismo que o JAX-RS usa para {@code @Valid} em parâmetro de recurso), não um
 * {@link ConstraintViolation} fabricado à mão, pra não mascarar a forma real do path.
 */
class ValidacaoBeanExceptionMapperTest {

    private final ValidacaoBeanExceptionMapper mapper = new ValidacaoBeanExceptionMapper();

    @Test
    void detalhesNaoVazaCaminhoInternoDoParametroJaxRs() throws NoSuchMethodException {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        ExecutableValidator executableValidator = validator.forExecutables();
        CadastroResource resource = new CadastroResource();
        Method metodo = CadastroResource.class.getMethod("registrar", CadastroRequest.class);
        CadastroRequest requestInvalido = new CadastroRequest(
                "Nome", "email-invalido", "Senha123!", 1L, LocalDate.of(2000, 1, 1));

        Set<ConstraintViolation<CadastroResource>> violacoes =
                executableValidator.validateParameters(resource, metodo, new Object[] { requestInvalido });
        ConstraintViolationException exception = new ConstraintViolationException(violacoes);

        Response resposta = mapper.toResponse(exception);
        ErroResponse corpo = (ErroResponse) resposta.getEntity();

        assertFalse(corpo.error().details().contains("registrar"), "não pode vazar o nome do método JAX-RS");
        assertFalse(corpo.error().details().contains("arg0"), "não pode vazar o índice/nome interno do parâmetro");
        assertTrue(corpo.error().details().contains("email: formato de e-mail inválido"),
                "precisa manter o nome do campo e a mensagem, só sem o prefixo interno");
    }

    @Test
    @SuppressWarnings("unchecked")
    void detalhesNaoContemNullQuandoPathNaoTemNodeNomeado() {
        // Nós CROSS_PARAMETER/BEAN (violação de classe, sem campo específico) têm
        // Path.Node.getName() == null — antes da correção isso virava "null: mensagem"
        // na resposta ao cliente.
        Path.Node nodeSemNome = mock(Path.Node.class);
        when(nodeSemNome.getName()).thenReturn(null);
        Path path = mock(Path.class);
        Iterator<Path.Node> iterator = Set.of(nodeSemNome).iterator();
        when(path.iterator()).thenReturn(iterator);

        ConstraintViolation<Object> violacao = mock(ConstraintViolation.class);
        when(violacao.getPropertyPath()).thenReturn(path);
        when(violacao.getMessage()).thenReturn("mensagem de erro de classe");

        ConstraintViolationException exception = new ConstraintViolationException(Set.of(violacao));

        Response resposta = mapper.toResponse(exception);
        ErroResponse corpo = (ErroResponse) resposta.getEntity();

        assertFalse(corpo.error().details().contains("null:"), "não pode devolver 'null:' como nome do campo");
        assertTrue(corpo.error().details().contains("validacao: mensagem de erro de classe"));
    }
}
