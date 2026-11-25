import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Casca da área de administração (`/admin`): abas Cursos, Usuários e Logs de auditoria acima
 * da tela escolhida. `/admin` redireciona para Cursos (ver `app.routes.ts`), então a área
 * sempre abre numa tela de trabalho e as outras ficam a um clique. Cada tela filha
 * traz o próprio `<h1>`.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  protected readonly abas = [
    { rotulo: 'Cursos', caminho: '/admin/cursos' },
    { rotulo: 'Usuários', caminho: '/admin/usuarios' },
    { rotulo: 'Logs de auditoria', caminho: '/admin/auditoria' },
  ] as const;
}
