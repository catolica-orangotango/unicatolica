import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, PERFIL_ADMINISTRADOR } from './auth.service';

/**
 * Protege a área administrativa (`/admin`): exige token **e** perfil
 * `ADMINISTRADOR`. Sem isso volta pra tela de login do admin (não a do aluno).
 * Só UX — o backend é quem barra de verdade as rotas administrativas (RF13).
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.obterToken() && authService.possuiPerfil(PERFIL_ADMINISTRADOR)) {
    return true;
  }

  return router.createUrlTree(['/admin/login']);
};
