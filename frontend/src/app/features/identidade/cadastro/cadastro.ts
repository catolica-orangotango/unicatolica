import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../../../core/config/api.config';
import { UcAuthShell } from '../../../layout/auth-shell/auth-shell';
import { UcButton } from '../../../ui/button/button';

/**
 * Envelope de erro padrão da API (AD-5) — espelha `ErroResponse` do backend.
 */
interface ErroResponse {
  error: {
    code: string;
    message: string;
    details: string | null;
  };
}

interface CadastroResponse {
  id: number;
  nome: string;
  email: string;
  curso: string;
  emailConfirmado: boolean;
  criadoEm: string;
}

/**
 * Tela de cadastro (Story 1.2), restilizada no Design System "Campus Clean" pela
 * Story 14.7. Cobre os critérios de aceite da história: envia nome, e-mail
 * institucional, senha, curso e data de nascimento para `POST /auth/registro`, e exibe as
 * mensagens de rejeição específicas por cenário (e-mail duplicado, domínio externo,
 * validação de campo, idade mínima) — nunca uma mensagem genérica de erro.
 *
 * Depois do 201 a tela troca para o estado "Verifique seu e-mail" (mesmo momento do
 * Flow 1 do EXPERIENCE.md), com o e-mail ecoado e a opção de reenviar a confirmação.
 */
@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule, UcAuthShell, UcButton],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.scss',
})
export class Cadastro {
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly sucesso = signal<CadastroResponse | null>(null);
  protected readonly reenviando = signal(false);
  protected readonly reenviado = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
    curso: ['', [Validators.required]],
    dataNascimento: ['', [Validators.required]],
  });

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    this.http.post<CadastroResponse>(`${API_BASE_URL}/auth/registro`, this.form.getRawValue()).subscribe({
      next: (resposta) => {
        this.enviando.set(false);
        this.sucesso.set(resposta);
        this.form.reset();
      },
      error: (resposta: HttpErrorResponse) => {
        this.enviando.set(false);
        this.erro.set(this.mensagemDeErro(resposta));
      },
    });
  }

  /** Tela "Verifique seu e-mail" (Story 1.3) — opção de reenviar a confirmação. */
  protected reenviarConfirmacao(): void {
    const usuario = this.sucesso();
    if (!usuario || this.reenviando()) {
      return;
    }

    this.reenviando.set(true);
    this.http.post(`${API_BASE_URL}/auth/confirmacao-email/reenvio`, { email: usuario.email }).subscribe({
      next: () => {
        this.reenviando.set(false);
        this.reenviado.set(true);
      },
      error: () => {
        // Backend nunca revela se o e-mail existe (evita enumeração) — sempre 202 aqui,
        // então um erro só acontece por falha de rede/servidor. Mesmo assim não bloqueia
        // o usuário: ele pode tentar de novo.
        this.reenviando.set(false);
      },
    });
  }

  private mensagemDeErro(resposta: HttpErrorResponse): string {
    const corpo = resposta.error as ErroResponse | null;
    if (corpo?.error?.message) {
      return corpo.error.message;
    }
    return 'Não foi possível completar o cadastro. Tente novamente em instantes.';
  }
}
