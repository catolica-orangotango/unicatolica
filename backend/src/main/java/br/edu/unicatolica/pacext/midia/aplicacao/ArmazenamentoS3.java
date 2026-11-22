package br.edu.unicatolica.pacext.midia.aplicacao;

import br.edu.unicatolica.pacext.midia.dominio.ArmazenamentoObjetos;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

/**
 * {@link ArmazenamentoObjetos} sobre qualquer provedor S3-compatível (extensão Quarkus Amazon
 * S3). Endpoint, região e credenciais vêm só da configuração ({@code quarkus.s3.*}); em dev e
 * teste o Dev Services sobe um S3 local.
 */
@ApplicationScoped
public class ArmazenamentoS3 implements ArmazenamentoObjetos {

    @Inject
    S3Client s3;

    @Inject
    S3Presigner presigner;

    @ConfigProperty(name = "midia.bucket")
    String bucket;

    @Override
    public void gravar(String chave, byte[] conteudo, String tipo) {
        s3.putObject(PutObjectRequest.builder().bucket(bucket).key(chave).contentType(tipo).build(),
                RequestBody.fromBytes(conteudo));
    }

    @Override
    public void remover(String chave) {
        s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(chave).build());
    }

    @Override
    public String urlAssinada(String chave, String nomeParaDownload, Duration validade) {
        GetObjectRequest leitura = GetObjectRequest.builder()
                .bucket(bucket)
                .key(chave)
                .responseContentDisposition(contentDisposition(nomeParaDownload))
                .build();
        return presigner.presignGetObject(GetObjectPresignRequest.builder()
                        .signatureDuration(validade)
                        .getObjectRequest(leitura)
                        .build())
                .url()
                .toString();
    }

    /**
     * {@code inline} (o navegador exibe PDF e imagem) com o nome sanitizado: sem {@code / \ "}
     * nem caracteres de controle, que quebrariam o cabeçalho ou sugeririam um caminho. O
     * {@code filename} leva só ASCII; o nome completo em UTF-8 vai em {@code filename*} (RFC 6266).
     */
    static String contentDisposition(String nome) {
        String limpo = sanitizar(nome);
        String ascii = limpo.replaceAll("[^\\x20-\\x7E]", "_");
        String utf8 = URLEncoder.encode(limpo, StandardCharsets.UTF_8).replace("+", "%20").replace("*", "%2A");
        return "inline; filename=\"" + ascii + "\"; filename*=UTF-8''" + utf8;
    }

    static String sanitizar(String nome) {
        String limpo = nome == null ? "" : nome.replaceAll("[/\\\\\"\\p{Cc}]", "").strip();
        return limpo.isEmpty() ? "arquivo" : limpo;
    }
}
