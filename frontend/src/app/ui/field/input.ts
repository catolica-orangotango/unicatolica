import { Directive, ElementRef, computed, inject } from '@angular/core';
import { UcField } from './field';

/**
 * Controle de formulário do redesign (KAN-91). Aplica a classe global
 * `uc-input` (estilo em `_input.scss`) e, dentro de um `<uc-field>`, liga o
 * `id`, `aria-invalid` e `aria-describedby` ao campo. Fora de um `<uc-field>`
 * só aplica a classe.
 */
@Directive({
  selector: 'input[ucInput], select[ucInput], textarea[ucInput]',
  host: {
    class: 'uc-input',
    '[attr.aria-invalid]': 'invalido()',
    '[attr.aria-describedby]': 'descritoPor()',
  },
})
export class UcInput {
  private readonly campo = inject(UcField, { optional: true });

  constructor() {
    // Dentro de um campo o id do campo vence; fora, o id do próprio elemento fica.
    if (this.campo) inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.id = this.campo.controlId;
  }

  protected readonly invalido = computed(() => (this.campo?.error() ? 'true' : null));
  protected readonly descritoPor = computed(() => {
    const campo = this.campo;
    if (!campo) return null;
    const ids = [
      campo.hint() ? `${campo.controlId}-dica` : null,
      campo.error() ? `${campo.controlId}-erro` : null,
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  });
}
