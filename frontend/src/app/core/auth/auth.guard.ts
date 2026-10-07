import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.sessaoValida()) {
    return true;
  }

  // Token vencido (KAN-78): apaga e avisa no login, em vez de abrir uma tela em que
  // toda chamada daria 401.
  if (authService.obterToken()) {
    authService.encerrarSessaoLocal();
    return router.createUrlTree(['/login'], { queryParams: { sessao: 'expirada' } });
  }

  return router.createUrlTree(['/login']);
};
