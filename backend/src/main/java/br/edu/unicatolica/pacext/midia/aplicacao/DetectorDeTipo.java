package br.edu.unicatolica.pacext.midia.aplicacao;

import br.edu.unicatolica.pacext.midia.dominio.TipoArquivo;
import java.util.Optional;

/**
 * Detecta o formato pela assinatura dos primeiros bytes ("magic number"). Extensão do nome e
 * {@code Content-Type} declarados pelo cliente são ignorados: só vale o conteúdo.
 */
public final class DetectorDeTipo {

    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PDF = {0x25, 0x50, 0x44, 0x46, 0x2D}; // "%PDF-"

    private DetectorDeTipo() {
    }

    public static Optional<TipoArquivo> detectar(byte[] inicio) {
        if (inicio == null) {
            return Optional.empty();
        }
        if (comecaCom(inicio, PNG)) {
            return Optional.of(TipoArquivo.PNG);
        }
        if (comecaCom(inicio, JPEG)) {
            return Optional.of(TipoArquivo.JPEG);
        }
        if (comecaCom(inicio, PDF)) {
            return Optional.of(TipoArquivo.PDF);
        }
        return Optional.empty();
    }

    private static boolean comecaCom(byte[] conteudo, byte[] prefixo) {
        if (conteudo.length < prefixo.length) {
            return false;
        }
        for (int i = 0; i < prefixo.length; i++) {
            if (conteudo[i] != prefixo[i]) {
                return false;
            }
        }
        return true;
    }
}
