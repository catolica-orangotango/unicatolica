import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UcAuthShell } from '../../../layout/auth-shell/auth-shell';
import { UcButton } from '../../../ui/button/button';

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

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  protected readonly enviando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
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
      return;
    }

    const { email, senha } = this.form.getRawValue();
    this.enviando.set(true);
    this.mensagemErro.set(null);

    this.authService.login(email!, senha!).subscribe({
      next: () => {
        this.enviando.set(false);
        this.router.navigateByUrl('/feed');
      },
      error: () => {
        this.enviando.set(false);
        this.mensagemErro.set('E-mail ou senha inválidos.');
      },
    });
  }
}
