import { Component, computed, input } from '@angular/core';
import { UcIcon } from '../icon/icon';

/** Tom do aviso: informativo, de atenção ou de erro. */
export type UcNoteTom = 'neutro' | 'alerta' | 'erro';

/**
 * Aviso em linha (KAN-91). `titulo` obrigatório em negrito, detalhe como
 * conteúdo projetado e ação opcional via `[acao]`. O tom `erro` usa
 * `role="alert"` (anunciado na hora); os demais usam `role="note"`.
 */
@Component({
  selector: 'uc-note',
  imports: [UcIcon],
  templateUrl: './note.html',
  styleUrl: './note.scss',
  host: {
    class: 'uc-note',
    '[class.uc-note--neutro]': "tom() === 'neutro'",
    '[class.uc-note--alerta]': "tom() === 'alerta'",
    '[class.uc-note--erro]': "tom() === 'erro'",
    '[attr.role]': "tom() === 'erro' ? 'alert' : 'note'",
  },
})
export class UcNote {
  readonly tom = input<UcNoteTom>('neutro');
  readonly titulo = input.required<string>();
  protected readonly icone = computed(() => (this.tom() === 'neutro' ? 'info' : 'alert'));
}
