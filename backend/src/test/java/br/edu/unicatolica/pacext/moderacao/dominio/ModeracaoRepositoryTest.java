package br.edu.unicatolica.pacext.moderacao.dominio;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.PersistenceException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Prova contra o Postgres real que a migration {@code moderacao-001} e as filas de moderação funcionam. */
@QuarkusTest
class ModeracaoRepositoryTest {

    // Ids fora da faixa dos seeds: sem FK (AD-3), as tabelas aceitam qualquer id de conteúdo/usuário.
    private static final Long AUTOR = 600_001L;
    private static final Long DENUNCIANTE = 600_002L;
    private static final Long MODERADOR = 600_003L;
    private static final Long MODERADOR_NEUTRO = 600_004L;

    @Inject
    DenunciaRepository denunciaRepository;

    @Inject
    AcaoModeracaoRepository acaoRepository;

    @Inject
    RestricaoUsuarioRepository restricaoRepository;

    @Test
    @TestTransaction
    void filaPendenteTrazMaisAntigaPrimeiroESemEscalonadas() {
        Instant agora = Instant.now();
        Denuncia nova = denuncia(500_001L, DENUNCIANTE, agora);
        Denuncia antiga = denuncia(500_002L, DENUNCIANTE, agora.minusSeconds(60));
        Denuncia escalonada = denuncia(500_003L, DENUNCIANTE, agora.minusSeconds(120));
        escalonar(escalonada);

        List<Denuncia> fila = denunciaRepository.listarPendentes(0, 10);

        assertEquals(List.of(antiga.id, nova.id), fila.stream().map(d -> d.id).toList());
        assertEquals(2, denunciaRepository.contarPendentes());
        assertEquals(List.of(escalonada.id),
                denunciaRepository.listarEscalonadasPara(MODERADOR_NEUTRO).stream().map(d -> d.id).toList());
    }

    @Test
    @TestTransaction
    void existeDenunciaReconheceOMesmoDenunciante() {
        denuncia(500_001L, DENUNCIANTE, Instant.now());

        assertTrue(denunciaRepository.existeDenuncia(TipoConteudo.PUBLICACAO, 500_001L, DENUNCIANTE));
        assertFalse(denunciaRepository.existeDenuncia(TipoConteudo.PUBLICACAO, 500_001L, AUTOR));
        assertFalse(denunciaRepository.existeDenuncia(TipoConteudo.COMENTARIO, 500_001L, DENUNCIANTE));
    }

    @Test
    @TestTransaction
    void bancoRejeitaDenunciaDuplicada() {
        denuncia(500_001L, DENUNCIANTE, Instant.now());

        assertThrows(PersistenceException.class, () -> denuncia(500_001L, DENUNCIANTE, Instant.now()));
    }

    @Test
    @TestTransaction
    void bancoRejeitaEscalonadaSemModeradorNeutro() {
        Denuncia d = novaDenuncia(500_001L, DENUNCIANTE, Instant.now());
        d.situacao = SituacaoDenuncia.ESCALONADA;

        assertThrows(PersistenceException.class, () -> denunciaRepository.persistAndFlush(d));
    }

    @Test
    @TestTransaction
    void bancoRejeitaEscalonarParaOProprioModerador() {
        Denuncia d = novaDenuncia(500_001L, DENUNCIANTE, Instant.now());
        d.situacao = SituacaoDenuncia.ESCALONADA;
        d.moderadorOriginalUsuarioId = MODERADOR;
        d.moderadorNeutroUsuarioId = MODERADOR;
        d.escalonadaEm = Instant.now();

        assertThrows(PersistenceException.class, () -> denunciaRepository.persistAndFlush(d));
    }

    @Test
    @TestTransaction
    void historicoDaDenunciaNaOrdemDasAcoes() {
        Instant agora = Instant.now();
        Denuncia d = denuncia(500_001L, DENUNCIANTE, agora);
        AcaoModeracao ocultar = acao(d, TipoAcaoModeracao.OCULTAR, "linguagem ofensiva", agora);
        AcaoModeracao restaurar = acao(d, TipoAcaoModeracao.RESTAURAR, null, agora.plusSeconds(30));

        assertEquals(List.of(ocultar.id, restaurar.id),
                acaoRepository.listarPorDenuncia(d).stream().map(a -> a.id).toList());
    }

    @Test
    @TestTransaction
    void bancoRejeitaOcultarSemMotivo() {
        Denuncia d = denuncia(500_001L, DENUNCIANTE, Instant.now());

        assertThrows(PersistenceException.class, () -> acao(d, TipoAcaoModeracao.OCULTAR, " ", Instant.now()));
    }

    @Test
    @TestTransaction
    void restricaoAtivaRespeitaPrazoERevogacao() {
        Instant agora = Instant.now();
        Long semPrazo = 610_001L;
        Long vencida = 610_002L;
        Long revogada = 610_003L;
        Long futura = 610_004L;
        restricao(semPrazo, agora.minus(1, ChronoUnit.DAYS), null, null);
        restricao(vencida, agora.minus(2, ChronoUnit.DAYS), agora.minus(1, ChronoUnit.DAYS), null);
        restricao(revogada, agora.minus(1, ChronoUnit.DAYS), null, agora.minusSeconds(60));
        restricao(futura, agora.plus(1, ChronoUnit.DAYS), null, null);

        assertTrue(restricaoRepository.existeRestricaoAtiva(semPrazo, agora));
        assertFalse(restricaoRepository.existeRestricaoAtiva(vencida, agora));
        assertFalse(restricaoRepository.existeRestricaoAtiva(revogada, agora));
        assertFalse(restricaoRepository.existeRestricaoAtiva(futura, agora));
    }

    @Test
    @TestTransaction
    void bancoRejeitaRestricaoQueTerminaAntesDeComecar() {
        Instant agora = Instant.now();

        assertThrows(PersistenceException.class, () -> restricao(610_001L, agora, agora.minusSeconds(1), null));
    }

    private Denuncia novaDenuncia(Long conteudoId, Long denunciante, Instant criadoEm) {
        Denuncia d = new Denuncia();
        d.tipoConteudo = TipoConteudo.PUBLICACAO;
        d.conteudoId = conteudoId;
        d.autorConteudoUsuarioId = AUTOR;
        d.denuncianteUsuarioId = denunciante;
        d.motivo = "conteúdo ofensivo";
        d.criadoEm = criadoEm;
        return d;
    }

    private Denuncia denuncia(Long conteudoId, Long denunciante, Instant criadoEm) {
        Denuncia d = novaDenuncia(conteudoId, denunciante, criadoEm);
        denunciaRepository.persistAndFlush(d);
        return d;
    }

    private void escalonar(Denuncia d) {
        d.situacao = SituacaoDenuncia.ESCALONADA;
        d.moderadorOriginalUsuarioId = MODERADOR;
        d.moderadorNeutroUsuarioId = MODERADOR_NEUTRO;
        d.escalonadaEm = Instant.now();
        denunciaRepository.flush();
    }

    private AcaoModeracao acao(Denuncia d, TipoAcaoModeracao tipo, String motivo, Instant criadoEm) {
        AcaoModeracao a = new AcaoModeracao();
        a.denuncia = d;
        a.tipoAcao = tipo;
        a.moderadorUsuarioId = MODERADOR;
        a.motivo = motivo;
        a.criadoEm = criadoEm;
        acaoRepository.persistAndFlush(a);
        return a;
    }

    private void restricao(Long usuarioId, Instant inicio, Instant fim, Instant revogadaEm) {
        RestricaoUsuario r = new RestricaoUsuario();
        r.usuarioId = usuarioId;
        r.moderadorUsuarioId = MODERADOR;
        r.motivo = "reincidência";
        r.inicioEm = inicio;
        r.fimEm = fim;
        r.revogadaEm = revogadaEm;
        restricaoRepository.persistAndFlush(r);
    }
}
