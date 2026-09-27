import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../core/config/api.config';
import { UcAuthShell } from '../../../layout/auth-shell/auth-shell';

type Estado = 'confirmando' | 'confirmado' | 'erro';

/**
 * Tela acessada pelo link enviado por e-mail (Story 1.3, RF01.2) —
 * `/confirmar-email?token=...`. Chama {@code POST /auth/confirmacao-email/{token}} assim
 * que carrega e mostra o resultado; idempotente no backend, então recarregar a página não
 * quebra nada.
 */
@Component({
  selector: 'app-confirmar-email',
  imports: [RouterLink, UcAuthShell],
  templateUrl: './confirmar-email.html',
  styleUrl: './confirmar-email.scss',
})
export class ConfirmarEmail {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  protected readonly estado = signal<Estado>('confirmando');
  protected readonly mensagemErro = signal<string | null>(null);

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.estado.set('erro');
      this.mensagemErro.set('Link de confirmação inválido.');
      return;
    }

    this.http.post(`${API_BASE_URL}/auth/confirmacao-email/${token}`, {}).subscribe({
      next: () => this.estado.set('confirmado'),
      error: (resposta: HttpErrorResponse) => {
        this.estado.set('erro');
        this.mensagemErro.set(resposta.error?.error?.message ?? 'Não foi possível confirmar seu e-mail.');
      },
    });
  }
}
