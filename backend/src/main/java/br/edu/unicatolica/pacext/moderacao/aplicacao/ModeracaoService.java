package br.edu.unicatolica.pacext.moderacao.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.moderacao.dominio.AcaoModeracao;
import br.edu.unicatolica.pacext.moderacao.dominio.AcaoModeracaoRepository;
import br.edu.unicatolica.pacext.moderacao.dominio.Denuncia;
import br.edu.unicatolica.pacext.moderacao.dominio.DenunciaRepository;
import br.edu.unicatolica.pacext.moderacao.dominio.SituacaoDenuncia;
import br.edu.unicatolica.pacext.moderacao.dominio.TipoAcaoModeracao;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeracao;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeravel;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Stories 12.4 (fila e análise, RF77/RF77.1) e 12.5 (ocultar/restaurar, RF78/RF78.1), mais o
 * descarte de denúncia improcedente. Só perfil {@code MODERADOR}; o administrador de
 * plataforma entra com o KAN-44. Toda ação vai para {@code acao_moderacao} e para o
 * {@code log_auditoria} (AD-11).
 */
@ApplicationScoped
public class ModeracaoService {

    static final String PERFIL_MODERADOR = "MODERADOR";

    static final int TAMANHO_MAXIMO_PAGINA = 100;

    /** Situações que o filtro da fila aceita — ESCALONADA entra com a Story 12.8. */
    private static final Set<SituacaoDenuncia> SITUACOES_FILTRAVEIS =
            Set.of(SituacaoDenuncia.PENDENTE, SituacaoDenuncia.RESOLVIDA, SituacaoDenuncia.DESCARTADA);

    @Inject
    DenunciaRepository denunciaRepository;

    @Inject
    AcaoModeracaoRepository acaoModeracaoRepository;

    @Inject
    PublicacaoModeracao publicacaoModeracao;

    @Inject
    AuditoriaService auditoriaService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /** Fila (Story 12.4) — situação ausente é PENDENTE; paginação fora da faixa é trazida para dentro. */
    public PageResponse<DenunciaEmAnalise> listar(String situacao, int pagina, int tamanho) {
        exigirModerador();
        SituacaoDenuncia filtro = validarSituacao(situacao);
        int paginaValida = Math.max(pagina, 0);
        int tamanhoValido = Math.clamp(tamanho, 1, TAMANHO_MAXIMO_PAGINA);
        List<Denuncia> denuncias = denunciaRepository.listarPorSituacao(filtro, paginaValida, tamanhoValido);
        Map<Long, PublicacaoModeravel> publicacoes =
                publicacaoModeracao.buscar(denuncias.stream().map(d -> d.conteudoId).distinct().toList());
        List<DenunciaEmAnalise> conteudo = denuncias.stream()
                .map(d -> new DenunciaEmAnalise(d, publicacoes.get(d.conteudoId)))
                .toList();
        return PageResponse.de(conteudo, paginaValida, tamanhoValido, denunciaRepository.contarPorSituacao(filtro));
    }

    public DenunciaEmAnalise obter(Long denunciaId) {
        exigirModerador();
        return emAnalise(buscar(denunciaId));
    }

    /**
     * Story 12.5 (RF78) — oculta a postagem e resolve esta denúncia e as outras pendentes do
     * mesmo conteúdo. O motivo é o que o autor vai receber (RF78.2) quando Notificações existir.
     */
    @Transactional
    public DenunciaEmAnalise ocultar(Long denunciaId, String motivo) {
        exigirModerador();
        Denuncia denuncia = buscar(denunciaId);
        String texto = Motivo.obrigatorio(motivo, "Informe o motivo da ocultação.");
        exigirPendente(denuncia);

        Long moderadorId = usuarioAutenticado.id();
        Instant agora = Instant.now();
        publicacaoModeracao.ocultar(denuncia.conteudoId);
        for (Denuncia pendente : denunciaRepository.listarPendentesDoConteudo(denuncia.tipoConteudo, denuncia.conteudoId)) {
            pendente.situacao = SituacaoDenuncia.RESOLVIDA;
            pendente.resolvidaEm = agora;
            registrarAcao(pendente, TipoAcaoModeracao.OCULTAR, moderadorId, texto, agora);
        }
        auditoriaService.registrar(moderadorId, "moderacao", "CONTEUDO_OCULTADO", "Publicacao", denuncia.conteudoId,
                "denuncia " + denuncia.id + ": " + texto);
        return emAnalise(denuncia);
    }

    /** Story 12.5 (RF78.1) — qualquer moderador, não só quem ocultou. A denúncia continua RESOLVIDA. */
    @Transactional
    public DenunciaEmAnalise restaurar(Long denunciaId) {
        exigirModerador();
        Denuncia denuncia = buscar(denunciaId);
        boolean oculta = publicacaoModeracao.buscar(denuncia.conteudoId).map(PublicacaoModeravel::oculta).orElse(false);
        if (denuncia.situacao != SituacaoDenuncia.RESOLVIDA || !oculta) {
            throw ApiException.conflito("SITUACAO_INVALIDA", "O conteúdo desta denúncia não está oculto.", null);
        }

        Long moderadorId = usuarioAutenticado.id();
        publicacaoModeracao.restaurar(denuncia.conteudoId);
        registrarAcao(denuncia, TipoAcaoModeracao.RESTAURAR, moderadorId, null, Instant.now());
        auditoriaService.registrar(moderadorId, "moderacao", "CONTEUDO_RESTAURADO", "Publicacao", denuncia.conteudoId,
                "denuncia " + denuncia.id);
        return emAnalise(denuncia);
    }

    /** Encerra só esta denúncia, sem mexer no conteúdo; motivo opcional, só para o histórico. */
    @Transactional
    public DenunciaEmAnalise descartar(Long denunciaId, String motivo) {
        exigirModerador();
        Denuncia denuncia = buscar(denunciaId);
        String texto = Motivo.opcional(motivo);
        exigirPendente(denuncia);

        Long moderadorId = usuarioAutenticado.id();
        Instant agora = Instant.now();
        denuncia.situacao = SituacaoDenuncia.DESCARTADA;
        denuncia.resolvidaEm = agora;
        registrarAcao(denuncia, TipoAcaoModeracao.DESCARTAR, moderadorId, texto, agora);
        auditoriaService.registrar(moderadorId, "moderacao", "DENUNCIA_DESCARTADA", "Denuncia", denuncia.id, texto);
        return emAnalise(denuncia);
    }

    /** 403 em vez de 404: a fila existe para todo mundo, só não é de qualquer um (AD-5). */
    private void exigirModerador() {
        if (!usuarioAutenticado.possuiPerfil(PERFIL_MODERADOR)) {
            throw ApiException.semPermissao("ACESSO_NEGADO", "Você não tem permissão para executar esta ação.", null);
        }
    }

    private Denuncia buscar(Long denunciaId) {
        return denunciaRepository.findByIdOptional(denunciaId)
                .orElseThrow(() -> ApiException.naoEncontrado("DENUNCIA_NAO_ENCONTRADA", "Denúncia não encontrada.", null));
    }

    private static void exigirPendente(Denuncia denuncia) {
        if (denuncia.situacao != SituacaoDenuncia.PENDENTE) {
            throw ApiException.conflito("SITUACAO_INVALIDA", "Esta denúncia já foi analisada.", null);
        }
    }

    private static SituacaoDenuncia validarSituacao(String situacao) {
        if (situacao == null || situacao.isBlank()) {
            return SituacaoDenuncia.PENDENTE;
        }
        return SITUACOES_FILTRAVEIS.stream()
                .filter(s -> s.name().equals(situacao))
                .findFirst()
                .orElseThrow(() -> ApiException.validacao("PARAMETRO_INVALIDO", "Situação de denúncia inválida.",
                        "situacao deve ser PENDENTE, RESOLVIDA ou DESCARTADA"));
    }

    private DenunciaEmAnalise emAnalise(Denuncia denuncia) {
        return new DenunciaEmAnalise(denuncia, publicacaoModeracao.buscar(denuncia.conteudoId).orElse(null));
    }

    private void registrarAcao(Denuncia denuncia, TipoAcaoModeracao tipo, Long moderadorId, String motivo, Instant agora) {
        AcaoModeracao acao = new AcaoModeracao();
        acao.denuncia = denuncia;
        acao.tipoAcao = tipo;
        acao.moderadorUsuarioId = moderadorId;
        acao.motivo = motivo;
        acao.criadoEm = agora;
        acaoModeracaoRepository.persist(acao);
    }
}
