package br.edu.unicatolica.pacext.midia.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/** Nome no {@code Content-Disposition} da URL assinada: sem caracteres que quebram o cabeçalho. */
class ArmazenamentoS3Test {

    @Test
    void removeBarrasAspasEControle() {
        assertEquals("relatório final ..x.pdf", ArmazenamentoS3.sanitizar("relatório \"final\" ../x.pdf"));
        assertEquals("ab.pdf", ArmazenamentoS3.sanitizar("a\\b\r\n\u0000\u0085.pdf"));
    }

    @Test
    void nomeVazioViraArquivo() {
        assertEquals("arquivo", ArmazenamentoS3.sanitizar("/\"\\"));
        assertEquals("arquivo", ArmazenamentoS3.sanitizar(null));
    }

    @Test
    void filenameSoAsciiEFilenameEstrelaEmUtf8() {
        assertEquals("inline; filename=\"relat_rio final.pdf\"; filename*=UTF-8''relat%C3%B3rio%20final.pdf",
                ArmazenamentoS3.contentDisposition("relatório \"final\".pdf"));
    }
}
