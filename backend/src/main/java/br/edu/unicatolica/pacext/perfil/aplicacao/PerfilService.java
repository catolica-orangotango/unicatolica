package br.edu.unicatolica.pacext.perfil.aplicacao;

import br.edu.unicatolica.pacext.comunidades.AutoJoinCursoService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.identidade.UsuarioAtualizacao;
import br.edu.unicatolica.pacext.identidade.UsuarioConsulta;
import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.perfil.dominio.Interesse;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademico;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademicoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Regras de negócio do Épico 4 — Stories 4.1 (criar/editar), 4.2 (consultar o próprio) e
 * 4.4 (ver perfil público de outro). Story 4.3 (notificação de onboarding) fica de fora
 * desta fatia (depende do módulo Notificações).
 */
@ApplicationScoped
public class PerfilService {

    @Inject
    PerfilAcademicoRepository perfilAcademicoRepository;

    @Inject
    UsuarioConsulta usuarioConsulta;

    @Inject
    UsuarioAtualizacao usuarioAtualizacao;

    @Inject
    AutoJoinCursoService autoJoinCursoService;

    /** Story 4.2 (RF20) — qualquer perfil autenticado consulta o próprio. */
    public PerfilCompleto buscarProprio(Long usuarioId) {
        return montar(usuarioId, buscarResumoOuFalhar(usuarioId));
    }

    /**
     * Story 4.4 (RF20.2) — perfil de outro usuário, mesmos campos, só leitura (a
     * ausência de controle de edição é decisão do frontend, não deste método).
     */
    public PerfilCompleto buscarPublico(Long usuarioId) {
        return montar(usuarioId, buscarResumoOuFalhar(usuarioId));
    }

    /**
     * Story 4.1 (RF14, RF15, RF16, RF17, RF18, RF19) — cria o perfil se ainda não existir,
     * ou edita se já existir (mesma operação, RF14/RF19). Nome/curso vão para Identidade
     * (RF15/RF16, {@link UsuarioAtualizacao}); se o curso mudou, ressincroniza o auto-join
     * de comunidade de curso na mesma chamada (RF16, {@link AutoJoinCursoService} — mesma
     * interface que a Story 2.3 já usa no cadastro). Período e interesses (RF17/RF18) vão
     * para a tabela própria deste módulo.
     */
    @Transactional
    public PerfilCompleto salvar(Long usuarioId, String nome, String curso, Integer periodo,
            List<String> interesses) {
        String nomeValidado = validarNomeObrigatorio(nome);
        String cursoNormalizado = normalizar(curso);
        UsuarioResumo resumoAtual = buscarResumoOuFalhar(usuarioId);

        usuarioAtualizacao.atualizarNomeECurso(usuarioId, nomeValidado, cursoNormalizado);
        autoJoinCursoService.sincronizarCursoDoAluno(usuarioId, resumoAtual.curso(), cursoNormalizado);

        PerfilAcademico perfil = perfilAcademicoRepository.buscarPorUsuarioId(usuarioId).orElseGet(() -> {
            PerfilAcademico novo = new PerfilAcademico();
            novo.usuarioId = usuarioId;
            novo.criadoEm = Instant.now();
            return novo;
        });
        perfil.periodo = periodo;
        perfil.interesses.clear();
        if (interesses != null) {
            interesses.stream()
                    .map(PerfilService::normalizar)
                    .filter(texto -> texto != null && !texto.isBlank())
                    .forEach(texto -> perfil.interesses.add(new Interesse(perfil, texto)));
        }
        perfil.atualizadoEm = Instant.now();
        if (perfil.id == null) {
            perfilAcademicoRepository.persist(perfil);
        }

        return new PerfilCompleto(usuarioId, nomeValidado, cursoNormalizado, periodo,
                perfil.interesses.stream().map(i -> i.texto).toList());
    }

    private PerfilCompleto montar(Long usuarioId, UsuarioResumo resumo) {
        Optional<PerfilAcademico> perfil = perfilAcademicoRepository.buscarPorUsuarioId(usuarioId);
        Integer periodo = perfil.map(p -> p.periodo).orElse(null);
        List<String> interesses = perfil.map(p -> p.interesses.stream().map(i -> i.texto).toList())
                .orElse(List.of());
        return new PerfilCompleto(usuarioId, resumo.nome(), resumo.curso(), periodo, interesses);
    }

    private UsuarioResumo buscarResumoOuFalhar(Long usuarioId) {
        Map<Long, UsuarioResumo> resumos = usuarioConsulta.buscarResumos(List.of(usuarioId));
        UsuarioResumo resumo = resumos.get(usuarioId);
        if (resumo == null) {
            throw ApiException.naoEncontrado("RECURSO_NAO_ENCONTRADO", "Usuário não encontrado.", null);
        }
        return resumo;
    }

    private static String validarNomeObrigatorio(String nome) {
        String normalizado = normalizar(nome);
        if (normalizado == null) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Informe seu nome.", "nome");
        }
        return normalizado;
    }

    private static String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String semEspacos = texto.trim();
        return semEspacos.isEmpty() ? null : semEspacos;
    }
}
