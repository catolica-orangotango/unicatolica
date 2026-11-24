package br.edu.unicatolica.pacext.enquetes.aplicacao;

import br.edu.unicatolica.pacext.comunidades.ComunidadeConsulta;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.enquetes.dominio.Enquete;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteOpcao;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteParticipacao;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteParticipacaoRepository;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteRepository;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteVoto;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteVotoRepository;
import br.edu.unicatolica.pacext.enquetes.dominio.SituacaoEnquete;
import br.edu.unicatolica.pacext.enquetes.dominio.TipoEnquete;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Regras de negócio das Stories 8.1 (criar enquete) e 8.3 (votar) do Epic 8, mais as listagens que a tela precisa. */
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

    /** RF58.1 — votos mínimos para mostrar o resultado de uma enquete ativa. */
    static final int MINIMO_VOTOS_PARA_RESULTADO = 5;

    @Inject
    EnqueteRepository enqueteRepository;

    @Inject
    EnqueteParticipacaoRepository participacaoRepository;

    @Inject
    EnqueteVotoRepository votoRepository;

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
     * Story 8.3 (RF55, RF55.1, RF55.3, RF56, RF56.1, RF57.1) — o voto é anônimo: grava, sem ligação
     * entre si, que o usuário participou ({@code enquete_participacao}) e qual opção foi escolhida
     * ({@code enquete_voto}). Só membro da comunidade de origem vota; enquanto não existe fixação na
     * homepage (Story 8.2), toda enquete é "não fixada" e exige ser membro (a votação de não membro em
     * enquete fixada é a Story 8.4).
     */
    @Transactional
    public void votar(Long usuarioId, Long enqueteId, List<Long> opcaoIds) {
        Enquete enquete = enqueteRepository.findById(enqueteId);
        if (enquete == null) {
            throw ApiException.naoEncontrado("ENQUETE_NAO_ENCONTRADA", "Enquete não encontrada.", null);
        }
        if (!comunidadeConsulta.ehMembro(enquete.comunidadeId, usuarioId)) {
            throw ApiException.semPermissao("NAO_E_MEMBRO", "Só membros da comunidade podem votar nesta enquete.", null);
        }
        List<Long> escolhidas = validarEscolha(enquete, opcaoIds);
        if (enquete.situacao != SituacaoEnquete.ATIVA) {
            throw ApiException.conflito("ENQUETE_NAO_ACEITA_VOTOS", "Esta enquete não aceita mais votos.", null);
        }
        if (participacaoRepository.jaVotou(enqueteId, usuarioId)) {
            throw jaVotou();
        }

        EnqueteParticipacao participacao = new EnqueteParticipacao();
        participacao.enqueteId = enqueteId;
        participacao.usuarioId = usuarioId;
        try {
            // Flush na hora: dois votos ao mesmo tempo esbarram na restrição única, não duplicam o voto (RF56.1).
            participacaoRepository.persistAndFlush(participacao);
        } catch (PersistenceException e) {
            throw jaVotou();
        }
        for (Long opcaoId : escolhidas) {
            EnqueteVoto voto = new EnqueteVoto();
            voto.opcaoId = opcaoId;
            votoRepository.persist(voto);
        }
    }

    /** Das enquetes dadas, as em que o usuário já votou — para o "jaVotei" da página (RF56.1). */
    public Set<Long> enquetesVotadas(Long usuarioId, Collection<Enquete> enquetes) {
        return participacaoRepository.enquetesVotadas(usuarioId, enquetes.stream().map(e -> e.id).toList());
    }

    /**
     * Story 8.5 (RF57, RF58, RF58.1) — resultado das enquetes dadas, só das que o usuário pode ver:
     * ativa em que ele já votou (com o mínimo de votos para liberar a contagem) e encerrada (todos veem,
     * Story 8.6). Quem não votou numa ativa, ou enquete oculta, fica fora do mapa — nem o total sai.
     */
    public Map<Long, ResultadoEnquete> resultados(Collection<Enquete> enquetes, Set<Long> votadas) {
        List<Enquete> visiveis = enquetes.stream().filter(e -> resultadoVisivel(e, votadas)).toList();
        if (visiveis.isEmpty()) {
            return Map.of();
        }
        Map<Long, Integer> totais = participacaoRepository.totalPorEnquete(visiveis.stream().map(e -> e.id).toList());
        Map<Long, Integer> votos = votoRepository.contagemPorOpcao(
                visiveis.stream().flatMap(e -> e.opcoes.stream()).map(o -> o.id).toList());
        Map<Long, ResultadoEnquete> resultados = new HashMap<>();
        for (Enquete enquete : visiveis) {
            int total = totais.getOrDefault(enquete.id, 0);
            boolean liberado = enquete.situacao == SituacaoEnquete.ENCERRADA || total >= MINIMO_VOTOS_PARA_RESULTADO;
            Map<Long, Integer> porOpcao = new LinkedHashMap<>();
            if (liberado) {
                enquete.opcoes.forEach(o -> porOpcao.put(o.id, votos.getOrDefault(o.id, 0)));
            }
            resultados.put(enquete.id, new ResultadoEnquete(total, MINIMO_VOTOS_PARA_RESULTADO, liberado, porOpcao));
        }
        return resultados;
    }

    private static boolean resultadoVisivel(Enquete enquete, Set<Long> votadas) {
        return switch (enquete.situacao) {
            case ENCERRADA -> true;
            case ATIVA -> votadas.contains(enquete.id);
            case OCULTA -> false;
        };
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

    /** RF56 e RF54.2 — uma opção em escolha única; de uma até o limite em escolha múltipla; só da própria enquete. */
    private List<Long> validarEscolha(Enquete enquete, List<Long> opcaoIds) {
        if (opcaoIds == null || opcaoIds.isEmpty()) {
            throw ApiException.validacao("OPCAO_INVALIDA", "Escolha ao menos uma opção.", "opcaoIds");
        }
        if (opcaoIds.stream().anyMatch(java.util.Objects::isNull) || new HashSet<>(opcaoIds).size() != opcaoIds.size()) {
            throw ApiException.validacao("OPCAO_INVALIDA", "Escolha cada opção uma só vez.", "opcaoIds");
        }
        Set<Long> daEnquete = new HashSet<>();
        enquete.opcoes.forEach(o -> daEnquete.add(o.id));
        if (!daEnquete.containsAll(opcaoIds)) {
            throw ApiException.validacao("OPCAO_INVALIDA", "Escolha apenas opções desta enquete.", "opcaoIds");
        }
        if (enquete.tipo == TipoEnquete.UNICA && opcaoIds.size() > 1) {
            throw ApiException.validacao("SELECAO_MULTIPLA_NAO_PERMITIDA",
                    "Esta enquete é de escolha única: escolha só uma opção.", "opcaoIds");
        }
        if (enquete.tipo == TipoEnquete.MULTIPLA && opcaoIds.size() > enquete.limiteSelecao) {
            throw ApiException.validacao("LIMITE_SELECAO_EXCEDIDO",
                    "Você pode escolher até " + enquete.limiteSelecao + " opções.", "opcaoIds");
        }
        return List.copyOf(opcaoIds);
    }

    private static ApiException jaVotou() {
        return ApiException.conflito("JA_VOTOU", "Você já votou nesta enquete.", null);
    }

    private void garantirComunidadeExiste(Long comunidadeId) {
        if (!comunidadeConsulta.existe(comunidadeId)) {
            throw ApiException.naoEncontrado("COMUNIDADE_NAO_ENCONTRADA", "Comunidade não encontrada.", null);
        }
    }
}
