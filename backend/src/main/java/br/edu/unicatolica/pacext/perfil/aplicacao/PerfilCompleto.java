package br.edu.unicatolica.pacext.perfil.aplicacao;

import java.util.List;

/**
 * Perfil acadêmico com os dados do cadastro (RF20): nome e curso vêm de Identidade,
 * período e interesses do perfil. {@code periodo} nulo = perfil acadêmico ainda não criado.
 */
public record PerfilCompleto(Long usuarioId, String nome, Long cursoId, String cursoNome, Short periodo,
        List<String> interesses) {
}
