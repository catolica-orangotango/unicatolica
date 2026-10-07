import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * 401 numa chamada que levava `Authorization` significa sessão expirada ou encerrada
 * (KAN-78): apaga o token e volta para o login com o aviso. O 401 do próprio
 * `POST /auth/login` (credencial inválida) não leva o header e passa direto. O erro
 * segue para quem fez a chamada, que só limpa o próprio estado de carregamento.
 */
export const sessaoExpiradaInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return proximo(requisicao).pipe(
    catchError((erro: unknown) => {
      if (
        erro instanceof HttpErrorResponse &&
        erro.status === 401 &&
        requisicao.headers.has('Authorization')
      ) {
        authService.encerrarSessaoLocal();
        router.navigate(['/login'], { queryParams: { sessao: 'expirada' } });
      }
      return throwError(() => erro);
    }),
  );
};
