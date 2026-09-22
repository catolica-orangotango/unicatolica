import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AcessoNegadoPorPerfilError,
  AuthService,
  PERFIL_ADMINISTRADOR,
} from '../../../core/auth/auth.service';
import { UcButton } from '../../../ui';

/**
 * Login da área administrativa (Story 2.1) — tela própria, separada do login do aluno.
 * Usa o mesmo `POST /auth/login` (ver {@link AuthService.loginAdmin}); credencial de
 * aluno é recusada aqui sem deixar sessão aberta.
 */
@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, UcButton],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
})
export class AdminLogin {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  protected readonly enviando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);

  constructor() {
    if (this.authService.obterToken() && this.authService.possuiPerfil(PERFIL_ADMINISTRADOR)) {
      this.router.navigateByUrl('/admin');
    }
  }

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, senha } = this.form.getRawValue();
    this.enviando.set(true);
    this.mensagemErro.set(null);

    this.authService.loginAdmin(email, senha).subscribe({
      next: () => {
        this.enviando.set(false);
        this.router.navigateByUrl('/admin');
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.mensagemErro.set(this.mensagemDe(erro));
      },
    });
  }

  private mensagemDe(erro: unknown): string {
    if (erro instanceof AcessoNegadoPorPerfilError) {
      return 'Acesso restrito a administradores da plataforma.';
    }
    if (erro instanceof HttpErrorResponse && (erro.status === 0 || erro.status >= 500)) {
      return 'Não foi possível conectar ao servidor. Tente novamente em instantes.';
    }
    return 'E-mail ou senha inválidos.';
  }
}
