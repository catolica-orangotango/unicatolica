package br.edu.unicatolica.pacext.perfil.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.identidade.DadosCadastrais;
import br.edu.unicatolica.pacext.identidade.UsuarioCadastro;
import br.edu.unicatolica.pacext.notificacoes.NotificacaoEmissor;
import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademico;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademicoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/** Regras de negócio das Stories 4.1 (criar/editar), 4.2 (próprio perfil) e 4.4 (perfil de outro usuário). */
@ApplicationScoped
public class PerfilService {

    /** Limites do contrato ({@code PerfilRequest}). */
    static final int TAMANHO_MAXIMO_NOME = 200;
    static final int PERIODO_MINIMO = 1;
    static final int PERIODO_MAXIMO = 12;
    static final int MAXIMO_INTERESSES = 10;
    static final int TAMANHO_MAXIMO_INTERESSE = 50;

    @Inject
    PerfilAcademicoRepository perfilRepository;

    @Inject
    UsuarioCadastro usuarioCadastro;

    @Inject
    NotificacaoEmissor notificacaoEmissor;

    /** Story 4.2 (RF20) — sem perfil acadêmico ainda, devolve período nulo e interesses vazio. */
    public PerfilCompleto obter(Long usuarioId) {
        DadosCadastrais dados = usuarioCadastro.buscar(usuarioId)
                .orElseThrow(() -> ApiException.naoEncontrado("USUARIO_NAO_ENCONTRADO", "Usuário não encontrado.", null));
        return montar(dados, perfilRepository.buscarPorUsuarioId(usuarioId));
    }

    /**
     * Story 4.1 (RF14–RF19) — substitui o perfil inteiro, criando na primeira vez. Nome e
     * curso vão para o cadastro (Identidade); trocar o curso refaz o auto-join (RF24.1).
     */
    @Transactional
    public PerfilCompleto salvar(Long usuarioId, String nome, Long cursoId, Integer periodo, List<String> interesses) {
        validarNome(nome);
        if (cursoId == null) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Escolha seu curso.", "cursoId");
        }
        short periodoValido = validarPeriodo(periodo);
        List<String> interessesValidos = normalizarInteresses(interesses);

        DadosCadastrais dados = usuarioCadastro.atualizarNomeECurso(usuarioId, nome, cursoId);

        Optional<PerfilAcademico> existente = perfilRepository.buscarPorUsuarioId(usuarioId);
        PerfilAcademico perfil = existente.orElseGet(PerfilAcademico::new);
        if (existente.isEmpty()) {
            perfil.usuarioId = usuarioId;
            perfil.criadoEm = Instant.now();
        } else {
            perfil.atualizadoEm = Instant.now();
        }
        perfil.periodo = periodoValido;
        perfil.interesses.clear();
        perfil.interesses.addAll(interessesValidos);
        if (existente.isEmpty()) {
            perfilRepository.persist(perfil);
        }
        // Story 10.1: perfil completo (com interesses) encerra o aviso de onboarding, sem
        // esperar o usuário abrir a lista de notificações para marcar como lida.
        if (!perfil.interesses.isEmpty()) {
            notificacaoEmissor.marcarComoLidaPorTipo(usuarioId, TipoNotificacao.ONBOARDING_PERFIL);
        }
        return montar(dados, Optional.of(perfil));
    }

    private void validarNome(String nome) {
        if (nome == null || nome.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Informe seu nome.", "nome");
        }
        if (nome.strip().length() > TAMANHO_MAXIMO_NOME) {
            throw ApiException.validacao("NOME_MUITO_LONGO",
                    "O nome pode ter até " + TAMANHO_MAXIMO_NOME + " caracteres.", "nome");
        }
    }

    private short validarPeriodo(Integer periodo) {
        if (periodo == null || periodo < PERIODO_MINIMO || periodo > PERIODO_MAXIMO) {
            throw ApiException.validacao("PERIODO_INVALIDO",
                    "Informe um período entre " + PERIODO_MINIMO + " e " + PERIODO_MAXIMO + ".", "periodo");
        }
        return periodo.shortValue();
    }

    /**
     * Tira espaços das pontas e repetidos no meio, e junta os que só diferem em
     * maiúsculas/espaços (fica a primeira grafia). O limite de 10 conta depois de juntar.
     */
    static List<String> normalizarInteresses(List<String> interesses) {
        if (interesses == null) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Envie a lista de interesses, mesmo vazia.", "interesses");
        }
        Map<String, String> porChave = new LinkedHashMap<>();
        for (String interesse : interesses) {
            String texto = interesse == null ? "" : interesse.strip().replaceAll("\\s+", " ");
            if (texto.isEmpty() || texto.length() > TAMANHO_MAXIMO_INTERESSE) {
                throw ApiException.validacao("INTERESSE_INVALIDO",
                        "Cada interesse precisa ter de 1 a " + TAMANHO_MAXIMO_INTERESSE + " caracteres.", "interesses");
            }
            porChave.putIfAbsent(texto.toLowerCase(Locale.ROOT), texto);
        }
        if (porChave.size() > MAXIMO_INTERESSES) {
            throw ApiException.validacao("INTERESSES_DEMAIS",
                    "Escolha até " + MAXIMO_INTERESSES + " interesses.", "interesses");
        }
        return new ArrayList<>(porChave.values());
    }

    private static PerfilCompleto montar(DadosCadastrais dados, Optional<PerfilAcademico> perfil) {
        // perfil_interesse não guarda ordem: devolve em ordem alfabética para a resposta ser estável.
        List<String> interesses = perfil.map(p -> p.interesses.stream()
                        .sorted(Comparator.comparing(i -> i.toLowerCase(Locale.ROOT)))
                        .toList())
                .orElse(List.of());
        return new PerfilCompleto(dados.usuarioId(), dados.nome(), dados.cursoId(), dados.cursoNome(),
                perfil.map(p -> p.periodo).orElse(null), interesses);
    }
}
