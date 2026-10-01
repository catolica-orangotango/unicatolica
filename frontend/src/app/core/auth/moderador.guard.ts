import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Telas de moderação (Epic 12) só para perfil MODERADOR — o mesmo que o backend exige.
 * Quem não é volta para o Início em vez de ver uma tela que só daria 403. O
 * ADMINISTRADOR de plataforma entra quando o papel existir no backend (KAN-44).
 */
export const moderadorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.possuiPerfil('MODERADOR') ? true : router.createUrlTree(['/feed']);
};
