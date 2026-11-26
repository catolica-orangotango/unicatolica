import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { UcAuthShell } from '../../../layout/auth-shell/auth-shell';
import { UcButton } from '../../../ui/button/button';
import { ToastService } from '../../../ui/toast/toast.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, UcAuthShell, UcButton],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  protected readonly enviando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  // A API só devolve EMAIL_NAO_CONFIRMADO a quem acertou a senha (AuthService), então o aviso não vaza contas.
  protected readonly emailNaoConfirmado = signal(false);
  protected readonly reenviando = signal(false);
  // Vem do authGuard ou do sessaoExpiradaInterceptor (KAN-78).
  protected readonly sessaoExpirada =
    this.route.snapshot.queryParamMap.get('sessao') === 'expirada';

  constructor() {
    // sessaoValida, não só obterToken: com um token vencido no localStorage, o login
    // mandaria para /feed e o authGuard devolveria para cá, em ciclo.
    if (this.authService.sessaoValida()) {
      this.router.navigateByUrl('/feed');
    }
  }

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focarPrimeiroInvalido();
      return;
    }

    const { email, senha } = this.form.getRawValue();
    this.enviando.set(true);
    this.mensagemErro.set(null);
    this.emailNaoConfirmado.set(false);

    this.authService.login(email!, senha!).subscribe({
      next: () => {
        this.enviando.set(false);
        this.router.navigateByUrl('/feed');
      },
      error: (erro: HttpErrorResponse) => {
        this.enviando.set(false);
        // Conta desativada pelo administrador (KAN-83): a API só diz isso a quem acertou a senha.
        if (erro.error?.error?.code === 'EMAIL_NAO_CONFIRMADO') {
          this.emailNaoConfirmado.set(true);
          return;
        }
        const desativada = erro.error?.error?.code === 'CONTA_DESATIVADA';
        this.mensagemErro.set(
          desativada && typeof erro.error?.error?.message === 'string'
            ? erro.error.error.message
            : 'E-mail ou senha inválidos.',
        );
      },
    });
  }

  /** Reenvia o link para o e-mail digitado; a API responde 202 sempre (não revela se a conta existe). */
  protected reenviarConfirmacao(): void {
    if (this.reenviando()) {
      return;
    }
    this.reenviando.set(true);
    const email = this.form.getRawValue().email;
    this.http.post(`${API_BASE_URL}/auth/confirmacao-email/reenvio`, { email }).subscribe({
      next: () => {
        this.reenviando.set(false);
        this.toastService.mostrar('Enviamos um novo link de confirmação para o seu e-mail.');
      },
      error: () => {
        this.reenviando.set(false);
        this.toastService.mostrar('Não foi possível reenviar agora.', {
          tipo: 'erro',
          acao: { rotulo: 'Tentar de novo', aoAcionar: () => this.reenviarConfirmacao() },
        });
      },
    });
  }

  /** Leva o foco ao primeiro campo com erro (WCAG 3.3.1), na ordem da tela. */
  private focarPrimeiroInvalido(): void {
    const campo = this.form.controls.email.invalid ? 'email' : 'senha';
    document.getElementById(campo)?.focus();
  }
}
