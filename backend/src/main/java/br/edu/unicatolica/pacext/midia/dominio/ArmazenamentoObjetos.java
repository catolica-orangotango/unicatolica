package br.edu.unicatolica.pacext.midia.dominio;

import java.time.Duration;

/**
 * Armazenamento de objetos onde ficam os bytes dos arquivos. A implementação fala S3
 * ({@code ArmazenamentoS3}); o provedor entra só por configuração.
 */
public interface ArmazenamentoObjetos {

    void gravar(String chave, byte[] conteudo, String tipo);

    void remover(String chave);

    /**
     * URL de leitura que expira em {@code validade}. O bucket é privado: é o único jeito de o
     * navegador ler o objeto. {@code nomeParaDownload} vai no {@code Content-Disposition}.
     */
    String urlAssinada(String chave, String nomeParaDownload, Duration validade);
}
