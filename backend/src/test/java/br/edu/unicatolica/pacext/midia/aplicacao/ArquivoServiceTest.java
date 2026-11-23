package br.edu.unicatolica.pacext.midia.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.midia.FinalidadeArquivo;
import br.edu.unicatolica.pacext.midia.dominio.ArmazenamentoObjetos;
import br.edu.unicatolica.pacext.midia.dominio.Arquivo;
import br.edu.unicatolica.pacext.midia.dominio.ArquivoRepository;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.mockito.ArgumentCaptor;

/** Testa {@link ArquivoService} isolado (Mockito): validação por conteúdo, limites e bucket antes do banco. */
class ArquivoServiceTest {

    private static final Long DONO_ID = 42L;
    private static final long LIMITE_PDF = 5_242_880L;
    private static final long LIMITE_IMAGEM = 2_097_152L;

    private ArquivoService service;
    private ArquivoRepository repository;
    private ArmazenamentoObjetos armazenamento;

    @BeforeEach
    void setUp() {
        service = new ArquivoService();
        repository = mock(ArquivoRepository.class);
        armazenamento = mock(ArmazenamentoObjetos.class);
        service.arquivoRepository = repository;
        service.armazenamento = armazenamento;
        service.limitePdfBytes = LIMITE_PDF;
        service.limiteImagemBytes = LIMITE_IMAGEM;
    }

    @Test
    void pngValidoVaiParaOBucketEDepoisParaOBanco() {
        byte[] png = png(100);

        Arquivo arquivo = service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "foto.png", png);

        ArgumentCaptor<String> chave = ArgumentCaptor.forClass(String.class);
        verify(armazenamento).gravar(chave.capture(), eq(png), eq("image/png"));
        assertTrue(chave.getValue().matches("arquivos/[0-9a-f-]{36}"), chave.getValue());
        verify(repository).persistAndFlush(arquivo);
        assertEquals(chave.getValue(), arquivo.chave);
        assertEquals(DONO_ID, arquivo.donoId);
        assertEquals(FinalidadeArquivo.ANEXO_POSTAGEM, arquivo.finalidade);
        assertEquals("image/png", arquivo.tipoConteudo);
        assertEquals(100L, arquivo.tamanhoBytes);
        assertEquals("foto.png", arquivo.nomeOriginal);
        assertFalse(arquivo.emUso);
        assertNotNull(arquivo.criadoEm);
    }

    @Test
    void chaveNaoLevaONomeOriginal() {
        Arquivo arquivo = service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "../../segredo.png", png(10));

        assertFalse(arquivo.chave.contains("segredo"));
        assertEquals("../../segredo.png", arquivo.nomeOriginal);
    }

    @Test
    void conteudoVazioDaArquivoObrigatorio() {
        assertCodigo("ARQUIVO_OBRIGATORIO",
                () -> service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "x.png", new byte[0]));
        assertCodigo("ARQUIVO_OBRIGATORIO",
                () -> service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "x.png", null));
    }

    @Test
    void finalidadeAusenteDaFinalidadeInvalida() {
        assertCodigo("FINALIDADE_INVALIDA", () -> service.enviar(DONO_ID, null, "x.png", png(10)));
    }

    @Test
    void gifDaFormatoNaoSuportado() {
        byte[] gif = "GIF89a....".getBytes(StandardCharsets.US_ASCII);

        assertCodigo("FORMATO_NAO_SUPORTADO",
                () -> service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "x.gif", gif));
    }

    @Test
    void pngComNomeDePdfEAceitoComoPng() {
        Arquivo arquivo = service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "x.pdf", png(10));

        assertEquals("image/png", arquivo.tipoConteudo);
    }

    @Test
    void pdfComNomeDePngEAceitoComoPdf() {
        Arquivo arquivo = service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "x.png", pdf(10));

        assertEquals("application/pdf", arquivo.tipoConteudo);
    }

    @Test
    void pdfComoFotoDePerfilDaFormatoNaoSuportado() {
        assertCodigo("FORMATO_NAO_SUPORTADO",
                () -> service.enviar(DONO_ID, FinalidadeArquivo.FOTO_PERFIL, "x.pdf", pdf(10)));
    }

    @Test
    void jpegComoFotoDePerfilEAceito() {
        Arquivo arquivo = service.enviar(DONO_ID, FinalidadeArquivo.FOTO_PERFIL, "eu.jpg", jpeg(10));

        assertEquals("image/jpeg", arquivo.tipoConteudo);
        assertEquals(FinalidadeArquivo.FOTO_PERFIL, arquivo.finalidade);
    }

    @Test
    void pdfAcimaDoLimiteDaArquivoMuitoGrande() {
        assertCodigo("ARQUIVO_MUITO_GRANDE",
                () -> service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "x.pdf", pdf(5_242_881)));
    }

    @Test
    void pdfExatamenteNoLimitePassa() {
        Arquivo arquivo = service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "x.pdf", pdf(5_242_880));

        assertEquals(5_242_880L, arquivo.tamanhoBytes);
    }

    @Test
    void imagemAcimaDoLimiteDaArquivoMuitoGrande() {
        assertCodigo("ARQUIVO_MUITO_GRANDE",
                () -> service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "x.png", png(2_097_153)));
        assertCodigo("ARQUIVO_MUITO_GRANDE",
                () -> service.enviar(DONO_ID, FinalidadeArquivo.FOTO_PERFIL, "x.jpg", jpeg(2_097_153)));
    }

    @Test
    void imagemExatamenteNoLimitePassa() {
        Arquivo arquivo = service.enviar(DONO_ID, FinalidadeArquivo.FOTO_PERFIL, "x.png", png(2_097_152));

        assertEquals(2_097_152L, arquivo.tamanhoBytes);
    }

    @Test
    void falhaAoGravarNoBucketNaoPersisteLinha() {
        doThrow(new RuntimeException("bucket fora do ar"))
                .when(armazenamento).gravar(anyString(), any(), anyString());

        assertThrows(RuntimeException.class,
                () -> service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "x.png", png(10)));

        verify(repository, never()).persistAndFlush(any(Arquivo.class));
        verify(repository, never()).persist(any(Arquivo.class));
    }

    @Test
    void falhaAoPersistirRemoveOObjetoDoBucket() {
        RuntimeException falha = new RuntimeException("banco fora do ar");
        doThrow(falha).when(repository).persistAndFlush(any(Arquivo.class));

        RuntimeException lancada = assertThrows(RuntimeException.class,
                () -> service.enviar(DONO_ID, FinalidadeArquivo.ANEXO_POSTAGEM, "x.png", png(10)));

        assertSame(falha, lancada);
        ArgumentCaptor<String> gravada = ArgumentCaptor.forClass(String.class);
        verify(armazenamento).gravar(gravada.capture(), any(), anyString());
        verify(armazenamento).remover(gravada.getValue());
    }

    @Test
    void rejeicaoNaoTocaNoBucket() {
        assertCodigo("FORMATO_NAO_SUPORTADO",
                () -> service.enviar(DONO_ID, FinalidadeArquivo.FOTO_PERFIL, "x.pdf", pdf(10)));

        verifyNoInteractions(armazenamento);
    }

    private static void assertCodigo(String code, Executable chamada) {
        ApiException erro = assertThrows(ApiException.class, chamada);
        assertEquals(400, erro.getStatus());
        assertEquals(code, erro.getCode());
    }

    private static byte[] png(int tamanho) {
        return comPrefixo(new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, tamanho);
    }

    private static byte[] jpeg(int tamanho) {
        return comPrefixo(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0}, tamanho);
    }

    private static byte[] pdf(int tamanho) {
        return comPrefixo("%PDF-1.7".getBytes(StandardCharsets.US_ASCII), tamanho);
    }

    private static byte[] comPrefixo(byte[] prefixo, int tamanho) {
        byte[] conteudo = Arrays.copyOf(prefixo, tamanho);
        return conteudo;
    }
}
