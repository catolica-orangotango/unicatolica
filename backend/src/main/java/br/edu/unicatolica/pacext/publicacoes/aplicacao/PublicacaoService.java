package br.edu.unicatolica.pacext.publicacoes.aplicacao;

import br.edu.unicatolica.pacext.comunidades.ComunidadeConsulta;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.midia.FinalidadeArquivo;
import br.edu.unicatolica.pacext.midia.MidiaAssociacao;
import br.edu.unicatolica.pacext.publicacoes.dominio.Publicacao;
import br.edu.unicatolica.pacext.publicacoes.dominio.PublicacaoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;

/** Regras de negócio das Stories 3.1 (criar postagem) e 3.2 (listar o feed) do Epic 3. */
@ApplicationScoped
public class PublicacaoService {

    /** Limite do contrato ({@code PublicacaoRequest.conteudo.maxLength}). */
    static final int TAMANHO_MAXIMO_CONTEUDO = 5000;

    static final int TAMANHO_MAXIMO_PAGINA = 100;

    @Inject
    PublicacaoRepository publicacaoRepository;

    @Inject
    ComunidadeConsulta comunidadeConsulta;

    @Inject
    MidiaAssociacao midiaAssociacao;

    /**
     * Story 3.1 (RF32–RF35) — autor é sempre quem está autenticado; só membro publica (RF27.1).
     * O anexo opcional só é reivindicado depois de comunidade e participação passarem, na mesma
     * transação: se a reivindicação falhar (404/409), nada é gravado.
     */
    @Transactional
    public Publicacao criar(Long usuarioId, Long comunidadeId, String conteudo, Long arquivoId) {
        String texto = validarConteudo(conteudo);
        garantirComunidadeExiste(comunidadeId);
        if (!comunidadeConsulta.ehMembro(comunidadeId, usuarioId)) {
            throw ApiException.semPermissao("NAO_E_MEMBRO", "Só membros da comunidade podem publicar nela.", null);
        }

        if (arquivoId != null) {
            midiaAssociacao.reivindicar(arquivoId, usuarioId, FinalidadeArquivo.ANEXO_POSTAGEM);
        }

        Publicacao publicacao = new Publicacao();
        publicacao.arquivoId = arquivoId;
        publicacao.comunidadeId = comunidadeId;
        publicacao.autorUsuarioId = usuarioId;
        publicacao.conteudo = texto;
        publicacao.criadoEm = Instant.now();
        publicacaoRepository.persist(publicacao);
        return publicacao;
    }

    /**
     * Story 3.2 (RF36) — aberto a qualquer autenticado, membro ou não (Story 2.5). Página e
     * tamanho fora da faixa do contrato são trazidos para dentro dela, em vez de virar 500.
     */
    public PageResponse<Publicacao> listar(Long comunidadeId, int pagina, int tamanho) {
        garantirComunidadeExiste(comunidadeId);
        int paginaValida = Math.max(pagina, 0);
        int tamanhoValido = Math.clamp(tamanho, 1, TAMANHO_MAXIMO_PAGINA);
        List<Publicacao> conteudo = publicacaoRepository.listarPorComunidade(comunidadeId, paginaValida, tamanhoValido);
        long total = publicacaoRepository.contarPorComunidade(comunidadeId);
        return PageResponse.de(conteudo, paginaValida, tamanhoValido, total);
    }

    private String validarConteudo(String conteudo) {
        if (conteudo == null || conteudo.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Escreva o conteúdo da postagem.", "conteudo");
        }
        String texto = conteudo.strip();
        if (texto.length() > TAMANHO_MAXIMO_CONTEUDO) {
            throw ApiException.validacao("CONTEUDO_MUITO_LONGO",
                    "A postagem pode ter até " + TAMANHO_MAXIMO_CONTEUDO + " caracteres.", "conteudo");
        }
        return texto;
    }

    private void garantirComunidadeExiste(Long comunidadeId) {
        if (!comunidadeConsulta.existe(comunidadeId)) {
            throw ApiException.naoEncontrado("COMUNIDADE_NAO_ENCONTRADA", "Comunidade não encontrada.", null);
        }
    }
}
