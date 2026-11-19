package br.edu.unicatolica.pacext.enquetes.aplicacao;

import br.edu.unicatolica.pacext.comunidades.ComunidadeConsulta;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.enquetes.dominio.Enquete;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteOpcao;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteRepository;
import br.edu.unicatolica.pacext.enquetes.dominio.SituacaoEnquete;
import br.edu.unicatolica.pacext.enquetes.dominio.TipoEnquete;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Regras de negócio da Story 8.1 (criar enquete) do Epic 8, mais as listagens que a tela precisa. */
@ApplicationScoped
public class EnqueteService {

    /** Limites do contrato ({@code EnqueteRequest}). */
    static final int TAMANHO_MAXIMO_PERGUNTA = 300;

    static final int TAMANHO_MAXIMO_OPCAO = 100;

    static final int MINIMO_OPCOES = 2;

    static final int MAXIMO_OPCOES = 5;

    /** RF53.3 — enquetes ativas por autor em cada comunidade. */
    static final int MAXIMO_ATIVAS_POR_COMUNIDADE = 2;

    static final int TAMANHO_MAXIMO_PAGINA = 100;

    @Inject
    EnqueteRepository enqueteRepository;

    @Inject
    ComunidadeConsulta comunidadeConsulta;

    /**
     * Story 8.1 (RF53.1, RF53.3, RF54.1–RF54.3) — autor é sempre quem está autenticado; só membro
     * cria. Valida o corpo antes de consultar a comunidade, como a criação de postagem.
     */
    @Transactional
    public Enquete criar(Long usuarioId, Long comunidadeId, String pergunta, String tipo,
            Integer limiteSelecao, List<String> opcoes) {
        String textoPergunta = validarPergunta(pergunta);
        TipoEnquete tipoEnquete = validarTipo(tipo);
        List<String> textosOpcoes = validarOpcoes(opcoes);
        Integer limite = validarLimiteSelecao(tipoEnquete, limiteSelecao, textosOpcoes.size());

        garantirComunidadeExiste(comunidadeId);
        if (!comunidadeConsulta.ehMembro(comunidadeId, usuarioId)) {
            throw ApiException.semPermissao("NAO_E_MEMBRO", "Só membros da comunidade podem criar enquete nela.", null);
        }
        if (enqueteRepository.contarAtivasDoAutorNaComunidade(usuarioId, comunidadeId) >= MAXIMO_ATIVAS_POR_COMUNIDADE) {
            throw ApiException.conflito("LIMITE_ENQUETES_ATIVAS",
                    "Você já tem " + MAXIMO_ATIVAS_POR_COMUNIDADE + " enquetes ativas nesta comunidade.", null);
        }

        Enquete enquete = new Enquete();
        enquete.comunidadeId = comunidadeId;
        enquete.autorUsuarioId = usuarioId;
        enquete.pergunta = textoPergunta;
        enquete.tipo = tipoEnquete;
        enquete.limiteSelecao = limite;
        enquete.situacao = SituacaoEnquete.ATIVA;
        enquete.criadaEm = Instant.now();
        for (int posicao = 0; posicao < textosOpcoes.size(); posicao++) {
            EnqueteOpcao opcao = new EnqueteOpcao();
            opcao.enquete = enquete;
            opcao.texto = textosOpcoes.get(posicao);
            opcao.posicao = posicao;
            enquete.opcoes.add(opcao);
        }
        enqueteRepository.persist(enquete);
        return enquete;
    }

    /**
     * Aberto a qualquer autenticado, membro ou não. Página e tamanho fora da faixa do contrato são
     * trazidos para dentro dela, em vez de virar 500.
     */
    public PageResponse<Enquete> listarDaComunidade(Long comunidadeId, int pagina, int tamanho) {
        garantirComunidadeExiste(comunidadeId);
        int paginaValida = Math.max(pagina, 0);
        int tamanhoValido = Math.clamp(tamanho, 1, TAMANHO_MAXIMO_PAGINA);
        List<Enquete> conteudo = enqueteRepository.listarPorComunidade(comunidadeId, paginaValida, tamanhoValido);
        return PageResponse.de(conteudo, paginaValida, tamanhoValido, enqueteRepository.contarPorComunidade(comunidadeId));
    }

    /** Enquetes ativas do usuário em todas as comunidades — a tela desabilita a comunidade que chegou a duas (RF53.3). */
    public PageResponse<Enquete> listarAtivasDoUsuario(Long usuarioId, int pagina, int tamanho) {
        int paginaValida = Math.max(pagina, 0);
        int tamanhoValido = Math.clamp(tamanho, 1, TAMANHO_MAXIMO_PAGINA);
        List<Enquete> conteudo = enqueteRepository.listarAtivasDoAutor(usuarioId, paginaValida, tamanhoValido);
        return PageResponse.de(conteudo, paginaValida, tamanhoValido, enqueteRepository.contarAtivasDoAutor(usuarioId));
    }

    private String validarPergunta(String pergunta) {
        if (pergunta == null || pergunta.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Escreva a pergunta da enquete.", "pergunta");
        }
        String texto = pergunta.strip();
        if (texto.length() > TAMANHO_MAXIMO_PERGUNTA) {
            throw ApiException.validacao("PERGUNTA_MUITO_LONGA",
                    "A pergunta pode ter até " + TAMANHO_MAXIMO_PERGUNTA + " caracteres.", "pergunta");
        }
        return texto;
    }

    private TipoEnquete validarTipo(String tipo) {
        if (tipo == null || tipo.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Escolha o tipo da enquete.", "tipo");
        }
        try {
            return TipoEnquete.valueOf(tipo.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.validacao("TIPO_INVALIDO", "O tipo da enquete deve ser UNICA ou MULTIPLA.", "tipo");
        }
    }

    /** RF54.3 — de 2 a 5 opções; cada uma preenchida, de até 100 caracteres e sem repetir outra. */
    private List<String> validarOpcoes(List<String> opcoes) {
        if (opcoes == null || opcoes.size() < MINIMO_OPCOES || opcoes.size() > MAXIMO_OPCOES) {
            throw ApiException.validacao("QUANTIDADE_OPCOES_INVALIDA",
                    "Informe de " + MINIMO_OPCOES + " a " + MAXIMO_OPCOES + " opções.", "opcoes");
        }
        List<String> textos = new ArrayList<>();
        Set<String> vistos = new HashSet<>();
        for (String opcao : opcoes) {
            if (opcao == null || opcao.isBlank()) {
                throw ApiException.validacao("OPCAO_VAZIA", "Preencha todas as opções ou remova as vazias.", "opcoes");
            }
            String texto = opcao.strip();
            if (texto.length() > TAMANHO_MAXIMO_OPCAO) {
                throw ApiException.validacao("OPCAO_MUITO_LONGA",
                        "Cada opção pode ter até " + TAMANHO_MAXIMO_OPCAO + " caracteres.", "opcoes");
            }
            if (!vistos.add(texto.toLowerCase(Locale.ROOT))) {
                throw ApiException.validacao("OPCAO_DUPLICADA", "As opções não podem se repetir.", "opcoes");
            }
            textos.add(texto);
        }
        return textos;
    }

    /** RF54.2 — só a múltipla tem limite, de 2 até o total de opções; na única ele é descartado. */
    private Integer validarLimiteSelecao(TipoEnquete tipo, Integer limite, int totalOpcoes) {
        if (tipo == TipoEnquete.UNICA) {
            return null;
        }
        if (limite == null) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO",
                    "Informe quantas opções cada pessoa pode escolher.", "limiteSelecao");
        }
        if (limite < 2 || limite > totalOpcoes) {
            throw ApiException.validacao("LIMITE_SELECAO_INVALIDO",
                    "O limite deve ficar entre 2 e o número de opções (" + totalOpcoes + ").", "limiteSelecao");
        }
        return limite;
    }

    private void garantirComunidadeExiste(Long comunidadeId) {
        if (!comunidadeConsulta.existe(comunidadeId)) {
            throw ApiException.naoEncontrado("COMUNIDADE_NAO_ENCONTRADA", "Comunidade não encontrada.", null);
        }
    }
}
