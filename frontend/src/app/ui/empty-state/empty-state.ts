import { Component, input } from '@angular/core';

/**
 * Estado vazio (KAN-91): caixa tracejada centralizada com título, descrição
 * opcional e uma ação projetada via `[acao]` (ex.: `button[uc-button]`).
 */
@Component({
  selector: 'uc-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class UcEmptyState {
  readonly titulo = input.required<string>();
  readonly descricao = input<string>();
}
