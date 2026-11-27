package br.edu.unicatolica.pacext.avisos.aplicacao;

import br.edu.unicatolica.pacext.avisos.dominio.Aviso;
import br.edu.unicatolica.pacext.avisos.dominio.AvisoRepository;
import br.edu.unicatolica.pacext.avisos.dominio.EscopoAviso;
import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.identidade.CursoConsulta;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Regras da Story 13.1 (RF81): só o administrador publica; o escopo é obrigatório. */
@ApplicationScoped
public class AvisoService {

    /** Limites da coluna e do contrato ({@code AvisoRequest}). */
    static final int TAMANHO_MAXIMO_TITULO = 120;
    static final int TAMANHO_MAXIMO_MENSAGEM = 2000;
    static final int TAMANHO_MAXIMO_PAGINA = 100;

    @Inject
    AvisoRepository avisoRepository;

    @Inject
    CursoConsulta cursoConsulta;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @Inject
    AuditoriaService auditoriaService;

    /**
     * Publica o aviso. Escopo GERAL ignora {@code cursoId}; escopo CURSO exige um curso existente.
     *
     * @param escopo {@code "GERAL"} ou {@code "CURSO"} — texto do corpo, validado aqui.
     */
    @Transactional
    public Aviso publicar(String titulo, String mensagem, String escopo, Long cursoId, LocalDate dataDestaque) {
        usuarioAutenticado.exigirAdministrador();
        String tituloValido = texto(titulo, "titulo", "Informe o título do aviso.", TAMANHO_MAXIMO_TITULO);
        String mensagemValida = texto(mensagem, "mensagem", "Escreva a mensagem do aviso.", TAMANHO_MAXIMO_MENSAGEM);
        EscopoAviso escopoValido = escopo(escopo);
        if (escopoValido == EscopoAviso.CURSO) {
            if (cursoId == null) {
                throw ApiException.validacao("CURSO_OBRIGATORIO", "Escolha o curso do aviso.", "cursoId");
            }
            if (cursoConsulta.nome(cursoId).isEmpty()) {
                throw ApiException.naoEncontrado("CURSO_NAO_ENCONTRADO", "Curso não encontrado.", null);
            }
        }

        Aviso aviso = new Aviso();
        aviso.titulo = tituloValido;
        aviso.mensagem = mensagemValida;
        aviso.escopo = escopoValido;
        aviso.cursoId = escopoValido == EscopoAviso.CURSO ? cursoId : null;
        aviso.dataDestaque = dataDestaque;
        aviso.autorUsuarioId = usuarioAutenticado.id();
        aviso.criadoEm = Instant.now();
        avisoRepository.persist(aviso);
        auditoriaService.registrar(aviso.autorUsuarioId, "avisos", "AVISO_PUBLICADO", "Aviso", aviso.id,
                "Aviso " + escopoValido.name().toLowerCase() + " publicado.");
        return aviso;
    }

    /** Os enviados, mais recente primeiro. Página e tamanho fora da faixa do contrato são trazidos para dentro dela. */
    public PageResponse<Aviso> listar(int pagina, int tamanho) {
        usuarioAutenticado.exigirAdministrador();
        int paginaValida = Math.max(pagina, 0);
        int tamanhoValido = Math.clamp(tamanho, 1, TAMANHO_MAXIMO_PAGINA);
        List<Aviso> conteudo = avisoRepository.listarRecentes(paginaValida, tamanhoValido);
        return PageResponse.de(conteudo, paginaValida, tamanhoValido, avisoRepository.count());
    }

    private static String texto(String valor, String campo, String mensagemObrigatorio, int limite) {
        if (valor == null || valor.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", mensagemObrigatorio, campo);
        }
        String limpo = valor.strip();
        if (limpo.length() > limite) {
            throw ApiException.validacao("CAMPO_MUITO_LONGO", "Use até " + limite + " caracteres.", campo);
        }
        return limpo;
    }

    private static EscopoAviso escopo(String valor) {
        if (valor != null) {
            for (EscopoAviso candidato : EscopoAviso.values()) {
                if (candidato.name().equals(valor)) {
                    return candidato;
                }
            }
        }
        throw ApiException.validacao("ESCOPO_OBRIGATORIO", "Escolha para quem é o aviso.", "escopo");
    }
}
