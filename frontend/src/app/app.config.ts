import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TitleStrategy, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { sessaoExpiradaInterceptor } from './core/auth/sessao-expirada.interceptor';
import { TituloStrategy } from './core/titulo/titulo.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: TituloStrategy },
    provideHttpClient(withInterceptors([sessaoExpiradaInterceptor])),
  ]
};
