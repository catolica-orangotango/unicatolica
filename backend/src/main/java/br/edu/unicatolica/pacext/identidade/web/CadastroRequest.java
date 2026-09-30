package br.edu.unicatolica.pacext.identidade.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** Corpo de {@code POST /auth/registro} (Story 1.2). Formato de e-mail (RF03) validado aqui via {@code @Email}. */
public record CadastroRequest(
        @NotBlank(message = "nome é obrigatório") String nome,
        @NotBlank(message = "email é obrigatório") @Email(message = "formato de e-mail inválido") String email,
        @NotBlank(message = "senha é obrigatória") String senha,
        @NotNull(message = "cursoId é obrigatório") Long cursoId,
        @NotNull(message = "dataNascimento é obrigatória") LocalDate dataNascimento) {
}
