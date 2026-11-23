package br.edu.unicatolica.pacext.midia.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.midia.FinalidadeArquivo;
import br.edu.unicatolica.pacext.midia.dominio.ArmazenamentoObjetos;
import br.edu.unicatolica.pacext.midia.dominio.Arquivo;
import br.edu.unicatolica.pacext.midia.dominio.ArquivoRepository;
import br.edu.unicatolica.pacext.midia.dominio.TipoArquivo;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import java.util.Arrays;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Recebe um arquivo (RF48–RF51): valida pelo conteúdo, grava no bucket e registra os
 * metadados. O vínculo com postagem ou perfil é feito depois, por quem usa o arquivo.
 */
@ApplicationScoped
public class ArquivoService {

    private static final Logger LOG = Logger.getLogger(ArquivoService.class);

    /** Tamanho da coluna {@code nome_original}. */
    static final int TAMANHO_MAXIMO_NOME = 255;

    private static final int BAD_REQUEST = Response.Status.BAD_REQUEST.getStatusCode();

    @Inject
    ArquivoRepository arquivoRepository;

    @Inject
    ArmazenamentoObjetos armazenamento;

    @ConfigProperty(name = "midia.limite.pdf-bytes")
    long limitePdfBytes;

    @ConfigProperty(name = "midia.limite.imagem-bytes")
    long limiteImagemBytes;

    /**
     * Grava no bucket e só depois persiste a linha: se o bucket falhar, nada vai para o banco;
     * se o banco falhar, o objeto recém-gravado é removido.
     */
    @Transactional
    public Arquivo enviar(Long donoId, FinalidadeArquivo finalidade, String nomeOriginal, byte[] conteudo) {
        if (finalidade == null) {
            throw finalidadeInvalida();
        }
        if (conteudo == null || conteudo.length == 0) {
            throw erro("ARQUIVO_OBRIGATORIO", "Selecione um arquivo para enviar.");
        }
        TipoArquivo tipo = DetectorDeTipo.detectar(conteudo)
                .filter(t -> finalidade != FinalidadeArquivo.FOTO_PERFIL || t.imagem())
                .orElseThrow(() -> formatoNaoSuportado(finalidade));
        long limite = tipo.imagem() ? limiteImagemBytes : limitePdfBytes;
        if (conteudo.length > limite) {
            throw erro("ARQUIVO_MUITO_GRANDE", (tipo.imagem() ? "Imagem" : "PDF")
                    + " pode ter até " + (limite / (1024 * 1024)) + " MB.");
        }

        String chave = "arquivos/" + UUID.randomUUID();
        armazenamento.gravar(chave, conteudo, tipo.mime());

        Arquivo arquivo = new Arquivo();
        arquivo.chave = chave;
        arquivo.tipoConteudo = tipo.mime();
        arquivo.tamanhoBytes = conteudo.length;
        arquivo.nomeOriginal = nome(nomeOriginal);
        arquivo.donoId = donoId;
        arquivo.finalidade = finalidade;
        arquivo.emUso = false;
        arquivo.criadoEm = Instant.now();
        try {
            // persistAndFlush: a falha do banco aparece aqui, ainda dentro do try.
            arquivoRepository.persistAndFlush(arquivo);
        } catch (RuntimeException falha) {
            removerSemMascarar(chave, falha);
            throw falha;
        }
        return arquivo;
    }

    /** Usado também pelo Resource para a parte {@code finalidade} ausente ou fora do enum. */
    public static ApiException finalidadeInvalida() {
        return new ApiException(BAD_REQUEST, "FINALIDADE_INVALIDA", "Informe a finalidade: "
                + String.join(" ou ", Arrays.stream(FinalidadeArquivo.values()).map(Enum::name).toList()) + ".",
                "finalidade");
    }

    private void removerSemMascarar(String chave, RuntimeException falha) {
        try {
            armazenamento.remover(chave);
        } catch (RuntimeException erroAoRemover) {
            LOG.warnf(erroAoRemover, "Objeto %s ficou órfão no bucket após falha ao persistir.", chave);
            falha.addSuppressed(erroAoRemover);
        }
    }

    private static ApiException formatoNaoSuportado(FinalidadeArquivo finalidade) {
        String aceitos = finalidade == FinalidadeArquivo.FOTO_PERFIL ? "PNG ou JPEG" : "PDF, PNG ou JPEG";
        return erro("FORMATO_NAO_SUPORTADO", "Formato não suportado. Envie " + aceitos + ".");
    }

    private static String nome(String nomeOriginal) {
        if (nomeOriginal == null || nomeOriginal.isBlank()) {
            return "arquivo";
        }
        String nome = nomeOriginal.strip();
        return nome.length() > TAMANHO_MAXIMO_NOME ? nome.substring(0, TAMANHO_MAXIMO_NOME) : nome;
    }

    private static ApiException erro(String code, String mensagem) {
        return new ApiException(BAD_REQUEST, code, mensagem, "arquivo");
    }
}
