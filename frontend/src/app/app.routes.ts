import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/identidade/login/login').then((m) => m.Login),
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./cadastro/cadastro').then((m) => m.Cadastro),
  },
  {
    path: 'confirmar-email',
    loadComponent: () => import('./confirmar-email/confirmar-email').then((m) => m.ConfirmarEmail),
  },
  {
    // Login do administrador — tela própria, fora do Shell do aluno e sem guard.
    path: 'admin/login',
    loadComponent: () => import('./features/admin/login/admin-login').then((m) => m.AdminLogin),
  },
  {
    // Área administrativa (Story 2.1): casca e home próprias, separadas do Shell do
    // aluno. `adminGuard` exige token com perfil ADMINISTRADOR.
    path: 'admin',
    loadComponent: () => import('./layout/admin-shell/admin-shell').then((m) => m.AdminShell),
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/home/admin-home').then((m) => m.AdminHome),
      },
      {
        path: 'relatorios',
        loadComponent: () =>
          import('./features/admin/relatorios/admin-relatorios').then((m) => m.AdminRelatorios),
      },
      {
        path: 'moderacao',
        loadComponent: () =>
          import('./features/admin/moderacao/admin-moderacao').then((m) => m.AdminModeracao),
      },
    ],
  },
  {
    // Casca de navegação global: layout de rota-filha sob um parent `path: ''`.
    // `canActivate` gate um acesso direto ao path do parent; `canActivateChild`
    // gate cada rota autenticada aninhada.
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: 'feed',
        loadComponent: () => import('./features/feed/feed').then((m) => m.Feed),
      },
      {
        path: 'comunidades',
        loadComponent: () =>
          import('./features/comunidades/comunidades-lista/comunidades-lista').then((m) => m.ComunidadesLista),
      },
      {
        // Mesmo padrão de "Home" pra qualquer comunidade — curso ou aberta (ver
        // ComunidadeDetalhe). Vem depois de 'comunidades' na lista, mas isso não
        // importa pro Router: segmentos diferentes ('comunidades' vs 'comunidades/:id'),
        // sem ambiguidade de precedência como haveria em frameworks tipo JAX-RS.
        path: 'comunidades/:id',
        loadComponent: () =>
          import('./features/comunidades/comunidade-detalhe/comunidade-detalhe').then((m) => m.ComunidadeDetalhe),
      },
    ],
  },
];
