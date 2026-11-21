package br.edu.unicatolica.pacext.midia.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.midia.ArquivoAnexado;
import br.edu.unicatolica.pacext.midia.FinalidadeArquivo;
import br.edu.unicatolica.pacext.midia.dominio.ArmazenamentoObjetos;
import br.edu.unicatolica.pacext.midia.dominio.Arquivo;
import br.edu.unicatolica.pacext.midia.dominio.ArquivoRepository;
import jakarta.persistence.LockModeType;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testa {@link MidiaServiceImpl} isolado (Mockito). */
class MidiaServiceImplTest {

    private MidiaServiceImpl service;
    private ArquivoRepository repository;
    private ArmazenamentoObjetos armazenamento;

    @BeforeEach
    void setUp() {
        service = new MidiaServiceImpl();
        repository = mock(ArquivoRepository.class);
        armazenamento = mock(ArmazenamentoObjetos.class);
        service.arquivoRepository = repository;
        service.armazenamento = armazenamento;
        service.urlValidadeMinutos = 10;
    }

    private Arquivo arquivo(long id, long dono, FinalidadeArquivo finalidade, boolean emUso) {
        Arquivo a = new Arquivo();
        a.id = id;
        a.chave = "arquivos/k" + id;
        a.tipoConteudo = "application/pdf";
        a.tamanhoBytes = 123;
        a.nomeOriginal = "doc" + id + ".pdf";
        a.donoId = dono;
        a.finalidade = finalidade;
        a.emUso = emUso;
        return a;
    }

    private void existe(Arquivo a) {
        when(repository.findById(a.id, LockModeType.PESSIMISTIC_WRITE)).thenReturn(a);
    }

    @Test
    void reivindicarMarcaEmUso() {
        Arquivo a = arquivo(1, 42, FinalidadeArquivo.ANEXO_POSTAGEM, false);
        existe(a);

        service.reivindicar(1L, 42L, FinalidadeArquivo.ANEXO_POSTAGEM);

        assertTrue(a.emUso);
    }

    @Test
    void donoDiferenteEFinalidadeDiferenteEInexistenteTemMesmaResposta404() {
        existe(arquivo(1, 42, FinalidadeArquivo.ANEXO_POSTAGEM, false));

        ApiException outroDono = assertThrows(ApiException.class,
                () -> service.reivindicar(1L, 99L, FinalidadeArquivo.ANEXO_POSTAGEM));
        ApiException outraFinalidade = assertThrows(ApiException.class,
                () -> service.reivindicar(1L, 42L, FinalidadeArquivo.FOTO_PERFIL));
        ApiException inexistente = assertThrows(ApiException.class,
                () -> service.reivindicar(7L, 42L, FinalidadeArquivo.ANEXO_POSTAGEM));

        for (ApiException e : List.of(outroDono, outraFinalidade, inexistente)) {
            assertEquals(404, e.getStatus());
            assertEquals("ARQUIVO_NAO_ENCONTRADO", e.getCode());
            assertEquals(outroDono.getMessage(), e.getMessage());
        }
    }

    @Test
    void segundaReivindicacaoDa409() {
        existe(arquivo(1, 42, FinalidadeArquivo.ANEXO_POSTAGEM, false));
        service.reivindicar(1L, 42L, FinalidadeArquivo.ANEXO_POSTAGEM);

        ApiException e = assertThrows(ApiException.class,
                () -> service.reivindicar(1L, 42L, FinalidadeArquivo.ANEXO_POSTAGEM));

        assertEquals(409, e.getStatus());
        assertEquals("ARQUIVO_EM_USO", e.getCode());
    }

    @Test
    void resolverDevolveUrlAssinadaComValidadeDe10MinutosENomeOriginal() {
        Arquivo a = arquivo(1, 42, FinalidadeArquivo.ANEXO_POSTAGEM, true);
        when(repository.list(anyString(), any(Object[].class))).thenReturn(List.of(a));
        when(armazenamento.urlAssinada("arquivos/k1", "doc1.pdf", Duration.ofMinutes(10)))
                .thenReturn("https://bucket/assinada");

        Map<Long, ArquivoAnexado> mapa = service.resolver(Set.of(1L, 2L));

        assertEquals(Set.of(1L), mapa.keySet());
        assertEquals(new ArquivoAnexado(1L, "doc1.pdf", "application/pdf", 123, "https://bucket/assinada"),
                mapa.get(1L));
    }

    @Test
    void resolverListaVaziaNaoConsultaOBanco() {
        assertTrue(service.resolver(List.of()).isEmpty());

        verifyNoInteractions(repository);
        verifyNoInteractions(armazenamento);
    }

    @Test
    void liberarRemoveObjetoELinha() {
        Arquivo a = arquivo(1, 42, FinalidadeArquivo.ANEXO_POSTAGEM, true);
        when(repository.findById(1L)).thenReturn(a);

        service.liberar(1L);

        verify(armazenamento).remover("arquivos/k1");
        verify(repository).delete(a);
    }

    @Test
    void liberarNuloOuInexistenteNaoFalha() {
        service.liberar(null);
        service.liberar(5L);

        verify(armazenamento, never()).remover(anyString());
    }
}
