import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Área /admin só para o perfil ADMINISTRADOR de plataforma, o mesmo que o backend exige.
 * Quem não é volta para o Início em vez de ver uma tela que só daria 403.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.possuiPerfil('ADMINISTRADOR') ? true : router.createUrlTree(['/feed']);
};
