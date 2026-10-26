package br.edu.unicatolica.pacext.compartilhado.seguranca;

/**
 * Perfis de plataforma, gravados em {@code usuario.perfil} e emitidos na claim {@code roles}
 * do JWT. Não confundir com {@code PapelMembro.ADMINISTRADOR}, o papel de um membro dentro
 * de uma comunidade.
 */
public final class Perfis {

    public static final String ALUNO = "ALUNO";
    public static final String MODERADOR = "MODERADOR";
    public static final String ADMINISTRADOR = "ADMINISTRADOR";

    private Perfis() {
    }

    /** Se {@code perfil} é um dos perfis de plataforma (a comparação é exata, com maiúsculas). */
    public static boolean ehValido(String perfil) {
        return ALUNO.equals(perfil) || MODERADOR.equals(perfil) || ADMINISTRADOR.equals(perfil);
    }
}
