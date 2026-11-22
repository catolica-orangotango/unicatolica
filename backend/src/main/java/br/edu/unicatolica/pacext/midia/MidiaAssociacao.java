package br.edu.unicatolica.pacext.midia;

/** Vínculo de um arquivo a quem o usa (postagem ou perfil): um arquivo serve a um uso só. */
public interface MidiaAssociacao {

    /**
     * Marca o arquivo como em uso. 404 {@code ARQUIVO_NAO_ENCONTRADO} se não existe, é de outro
     * dono ou de outra finalidade (mesma resposta, para não revelar existência); 409
     * {@code ARQUIVO_EM_USO} se já foi reivindicado.
     */
    void reivindicar(Long arquivoId, Long donoId, FinalidadeArquivo finalidade);

    /** Remove objeto e linha; id nulo ou inexistente não falha. */
    void liberar(Long arquivoId);
}
