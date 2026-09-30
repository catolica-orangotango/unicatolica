import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/identidade/login/login').then((m) => m.Login),
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./features/identidade/cadastro/cadastro').then((m) => m.Cadastro),
  },
  {
    path: 'confirmar-email',
    loadComponent: () => import('./features/identidade/confirmar-email/confirmar-email').then((m) => m.ConfirmarEmail),
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
        // Próprio perfil (Stories 4.1/4.2), aberto pelo menu da conta.
        path: 'perfil',
        loadComponent: () => import('./features/perfil/meu-perfil/meu-perfil').then((m) => m.MeuPerfil),
      },
      {
        // Perfil de outro usuário, somente leitura (Story 4.4), aberto pelo autor de uma postagem.
        path: 'usuarios/:id',
        loadComponent: () =>
          import('./features/perfil/perfil-usuario/perfil-usuario').then((m) => m.PerfilUsuario),
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
