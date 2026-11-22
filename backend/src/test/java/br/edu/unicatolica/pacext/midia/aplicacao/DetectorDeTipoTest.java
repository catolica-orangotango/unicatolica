package br.edu.unicatolica.pacext.midia.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;

import br.edu.unicatolica.pacext.midia.dominio.TipoArquivo;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** O tipo vem da assinatura dos primeiros bytes, nunca da extensão nem do Content-Type. */
class DetectorDeTipoTest {

    @Test
    void reconhecePng() {
        byte[] png = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00};

        assertEquals(Optional.of(TipoArquivo.PNG), DetectorDeTipo.detectar(png));
    }

    @Test
    void reconheceJpeg() {
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};

        assertEquals(Optional.of(TipoArquivo.JPEG), DetectorDeTipo.detectar(jpeg));
    }

    @Test
    void reconhecePdf() {
        byte[] pdf = "%PDF-1.7\n".getBytes(StandardCharsets.US_ASCII);

        assertEquals(Optional.of(TipoArquivo.PDF), DetectorDeTipo.detectar(pdf));
    }

    @Test
    void gifNaoEReconhecido() {
        byte[] gif = "GIF89a".getBytes(StandardCharsets.US_ASCII);

        assertEquals(Optional.empty(), DetectorDeTipo.detectar(gif));
    }

    @Test
    void vazioNaoEReconhecido() {
        assertEquals(Optional.empty(), DetectorDeTipo.detectar(new byte[0]));
    }

    @Test
    void prefixoIncompletoNaoEReconhecido() {
        byte[] metadeDoPng = {(byte) 0x89, 0x50, 0x4E};

        assertEquals(Optional.empty(), DetectorDeTipo.detectar(metadeDoPng));
    }
}
