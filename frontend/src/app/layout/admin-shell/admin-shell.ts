import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Casca da área administrativa (`/admin`) — separada do `Shell` do aluno de propósito:
 * o administrador tem identidade, navegação e home próprias (Story 2.1). Sidebar escura,
 * agrupada por seção (como no protótipo inicial): Dashboard geral, Central de relatórios
 * e logs, Moderação e o botão "Sair".
 */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly secoes = [
    { titulo: 'Principal', itens: [{ label: 'Dashboard geral', path: '/admin' }] },
    { titulo: 'Análise', itens: [{ label: 'Central de relatórios e logs', path: '/admin/relatorios' }] },
    { titulo: 'Segurança', itens: [{ label: 'Moderação', path: '/admin/moderacao' }] },
  ];

  protected sair(): void {
    this.auth.logout();
    this.router.navigateByUrl('/admin/login').catch(() => {});
  }
}
