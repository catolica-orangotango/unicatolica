package br.edu.unicatolica.pacext.moderacao.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.moderacao.dominio.Denuncia;
import br.edu.unicatolica.pacext.moderacao.dominio.DenunciaRepository;
import br.edu.unicatolica.pacext.moderacao.dominio.TipoConteudo;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeracao;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeravel;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;

/** Story 12.1 (RF75, RF76) — qualquer usuário autenticado denuncia uma postagem. */
@ApplicationScoped
public class DenunciaService {

    @Inject
    DenunciaRepository denunciaRepository;

    @Inject
    PublicacaoModeracao publicacaoModeracao;

    @Inject
    AuditoriaService auditoriaService;

    /**
     * O denunciante é guardado só para barrar denúncia repetida (RF77.1). Postagem oculta
     * responde como inexistente: parou de aceitar interações (RF78).
     */
    @Transactional
    public Denuncia registrar(Long denuncianteId, String tipoConteudo, Long conteudoId, String motivo) {
        TipoConteudo tipo = validarTipo(tipoConteudo);
        if (conteudoId == null) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Informe o conteúdo denunciado.", "conteudoId");
        }
        String texto = Motivo.obrigatorio(motivo, "Informe o motivo da denúncia.");

        PublicacaoModeravel publicacao = publicacaoModeracao.buscar(conteudoId)
                .filter(p -> !p.oculta())
                .orElseThrow(() -> ApiException.naoEncontrado("CONTEUDO_NAO_ENCONTRADO", "Conteúdo não encontrado.", null));
        if (publicacao.autorUsuarioId().equals(denuncianteId)) {
            throw ApiException.semPermissao("DENUNCIA_PROPRIO_CONTEUDO", "Você não pode denunciar o próprio conteúdo.", null);
        }
        if (denunciaRepository.existeDenuncia(tipo, conteudoId, denuncianteId)) {
            throw ApiException.conflito("DENUNCIA_DUPLICADA", "Você já denunciou este conteúdo.", null);
        }

        Denuncia denuncia = new Denuncia();
        denuncia.tipoConteudo = tipo;
        denuncia.conteudoId = conteudoId;
        denuncia.autorConteudoUsuarioId = publicacao.autorUsuarioId();
        denuncia.denuncianteUsuarioId = denuncianteId;
        denuncia.motivo = texto;
        denuncia.criadoEm = Instant.now();
        denunciaRepository.persist(denuncia);
        auditoriaService.registrar(denuncianteId, "moderacao", "DENUNCIA_REGISTRADA", "Denuncia", denuncia.id,
                tipo + " " + conteudoId);
        return denuncia;
    }

    /** Só postagem por enquanto: comentário e enquete entram no contrato com os módulos deles. */
    private static TipoConteudo validarTipo(String tipoConteudo) {
        if (tipoConteudo == null || tipoConteudo.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Informe o tipo do conteúdo denunciado.", "tipoConteudo");
        }
        if (!TipoConteudo.PUBLICACAO.name().equals(tipoConteudo)) {
            throw ApiException.validacao("TIPO_CONTEUDO_INVALIDO", "Tipo de conteúdo inválido.",
                    "tipoConteudo deve ser PUBLICACAO");
        }
        return TipoConteudo.PUBLICACAO;
    }
}
