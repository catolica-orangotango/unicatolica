package br.edu.unicatolica.pacext.perfil.aplicacao;

import java.util.List;

/**
 * Perfil acadêmico completo, já combinando o que é de Identidade (nome, curso) com o que
 * é deste módulo (período, interesses) — RF20. Quem lê nunca precisa saber que os dois
 * pedaços vêm de tabelas diferentes.
 */
public record PerfilCompleto(Long usuarioId, String nome, String curso, Integer periodo, List<String> interesses) {
}
