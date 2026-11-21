package br.edu.unicatolica.pacext.midia.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.midia.ArquivoAnexado;
import br.edu.unicatolica.pacext.midia.FinalidadeArquivo;
import br.edu.unicatolica.pacext.midia.MidiaAssociacao;
import br.edu.unicatolica.pacext.midia.MidiaConsulta;
import br.edu.unicatolica.pacext.midia.dominio.ArmazenamentoObjetos;
import br.edu.unicatolica.pacext.midia.dominio.Arquivo;
import br.edu.unicatolica.pacext.midia.dominio.ArquivoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/** API pública do módulo: resolver URLs, reivindicar e liberar arquivos. */
@ApplicationScoped
public class MidiaServiceImpl implements MidiaConsulta, MidiaAssociacao {

    @Inject
    ArquivoRepository arquivoRepository;

    @Inject
    ArmazenamentoObjetos armazenamento;

    @ConfigProperty(name = "midia.url-validade-minutos")
    long urlValidadeMinutos;

    @Override
    public Map<Long, ArquivoAnexado> resolver(Collection<Long> ids) {
        Map<Long, ArquivoAnexado> resultado = new HashMap<>();
        if (ids == null || ids.isEmpty()) {
            return resultado;
        }
        Duration validade = Duration.ofMinutes(urlValidadeMinutos);
        for (Arquivo a : arquivoRepository.list("id in ?1", ids)) {
            resultado.put(a.id, new ArquivoAnexado(a.id, a.nomeOriginal, a.tipoConteudo, a.tamanhoBytes,
                    armazenamento.urlAssinada(a.chave, a.nomeOriginal, validade)));
        }
        return resultado;
    }

    /**
     * Lock pessimista na linha (SELECT ... FOR UPDATE): duas reivindicações concorrentes do
     * mesmo arquivo se serializam e a segunda vê {@code emUso = true} e recebe 409.
     */
    @Override
    @Transactional
    public void reivindicar(Long arquivoId, Long donoId, FinalidadeArquivo finalidade) {
        Arquivo arquivo = arquivoId == null ? null
                : arquivoRepository.findById(arquivoId, LockModeType.PESSIMISTIC_WRITE);
        if (arquivo == null || !arquivo.donoId.equals(donoId) || arquivo.finalidade != finalidade) {
            throw ApiException.naoEncontrado("ARQUIVO_NAO_ENCONTRADO", "Arquivo não encontrado.", "arquivoId");
        }
        if (arquivo.emUso) {
            throw ApiException.conflito("ARQUIVO_EM_USO", "Este arquivo já está em uso.", "arquivoId");
        }
        arquivo.emUso = true;
    }

    @Override
    @Transactional
    public void liberar(Long arquivoId) {
        if (arquivoId == null) {
            return;
        }
        Arquivo arquivo = arquivoRepository.findById(arquivoId);
        if (arquivo == null) {
            return;
        }
        armazenamento.remover(arquivo.chave);
        arquivoRepository.delete(arquivo);
    }
}
