package br.edu.unicatolica.pacext.compartilhado.email;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.enterprise.inject.Instance;
import org.junit.jupiter.api.Test;

/** Falha do provedor não pode propagar para quem chamou (o cadastro já foi commitado). */
class EntregaEmailFalhaTest {

    @Test
    @SuppressWarnings("unchecked")
    void falhaDoTransporteEhSoRegistradaNoLog() {
        TransporteEmail transporte = mock(TransporteEmail.class);
        doThrow(new IllegalStateException("HTTP 401")).when(transporte).enviar(any());
        Instance<TransporteEmail> transportes = mock(Instance.class);
        when(transportes.get()).thenReturn(transporte);

        EmailService service = new EmailService();
        service.transportes = transportes;
        service.transporteConfigurado = "brevo-api";

        assertDoesNotThrow(() -> service.entregarAposCommit(
                new MensagemEmail("ana@catolicasc.edu.br", "Ana", "Assunto", "Texto")));
    }
}
