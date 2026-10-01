import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ModeracaoService } from '../moderacao.service';

/**
 * Contador de denúncias pendentes no item "Denúncias" da sidebar (UJ-2, passo 1;
 * key-denuncias.html). Lê o mesmo signal que a fila atualiza depois de cada ação, então
 * cai sem recarregar a página. Só busca para MODERADOR — o backend daria 403 a outros.
 */
@Component({
  selector: 'app-contador-denuncias',
  template: `@if (pendentes(); as total) {
    <span class="uc-text-meta contador" [attr.aria-label]="total + ' pendentes'">{{ total }}</span>
  }`,
  styleUrl: './contador-denuncias.scss',
})
export class ContadorDenuncias {
  private readonly moderacaoService = inject(ModeracaoService);

  protected readonly pendentes = this.moderacaoService.pendentes;

  constructor() {
    if (inject(AuthService).possuiPerfil('MODERADOR')) {
      this.moderacaoService.atualizarPendentes();
    }
  }
}
