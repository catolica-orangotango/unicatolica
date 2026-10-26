import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Telas de moderação só para MODERADOR ou ADMINISTRADOR, o mesmo que o backend exige.
 * Quem não é volta para o Início em vez de ver uma tela que só daria 403.
 */
export const moderadorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.possuiPerfil('MODERADOR') || authService.possuiPerfil('ADMINISTRADOR')
    ? true
    : router.createUrlTree(['/feed']);
};
