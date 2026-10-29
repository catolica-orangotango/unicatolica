import { Component, input } from '@angular/core';
import { UcIcon } from '../icon/icon';

let proximoId = 0;

/**
 * Campo de formulário (KAN-91): rótulo, controle projetado (com a diretiva
 * `ucInput`), dica e mensagem de erro. O controle projetado herda o `id` daqui
 * e aponta para a dica e o erro por `aria-describedby`. A mensagem de erro não
 * usa `role="alert"`: o leitor de tela a lê junto do campo.
 */
@Component({
  selector: 'uc-field',
  imports: [UcIcon],
  templateUrl: './field.html',
  styleUrl: './field.scss',
  host: { class: 'uc-field' },
})
export class UcField {
  readonly label = input.required<string>();
  readonly hint = input<string | undefined>();
  readonly error = input<string | null>(null);

  /** Id do controle; a dica e o erro derivam dele (`-dica`, `-erro`). */
  readonly controlId = `uc-field-${++proximoId}`;
}
