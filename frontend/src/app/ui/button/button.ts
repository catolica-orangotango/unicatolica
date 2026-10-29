import { Component, input } from '@angular/core';

export type UcButtonVariant = 'primary' | 'secondary' | 'danger';

/**
 * Botão do redesign (KAN-91): primário (maroon), secundário (contorno) e de perigo.
 *
 * Seletor de atributo sobre um `<button>` real: `<button uc-button>`. Manter o
 * elemento nativo preserva `type`, `disabled`, participação em formulário e foco.
 * Sem inputs, o botão é o primário no tamanho padrão (compatível com os usos
 * anteriores). `variant` e `size` viram classes no host (`uc-button--secondary`,
 * `uc-button--large`); o visual fica em button.scss.
 */
@Component({
  selector: 'button[uc-button]',
  template: '<ng-content></ng-content>',
  styleUrl: './button.scss',
  host: {
    class: 'uc-button',
    '[class.uc-button--primary]': "variant() === 'primary'",
    '[class.uc-button--secondary]': "variant() === 'secondary'",
    '[class.uc-button--danger]': "variant() === 'danger'",
    '[class.uc-button--large]': "size() === 'large'",
  },
})
export class UcButton {
  readonly variant = input<UcButtonVariant>('primary');
  readonly size = input<'default' | 'large'>('default');
}
