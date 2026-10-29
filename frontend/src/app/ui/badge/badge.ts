import { Component, input } from '@angular/core';
import { UcIcon } from '../icon/icon';

/**
 * Variantes do badge no redesign (KAN-91).
 * - `counter`: contador de notificações (maroon, texto claro).
 * - `role`: papel do membro (maroon-tint, texto maroon).
 * - `course` e `open`: tipo de comunidade (curso = estilo de `role`; aberta = neutro).
 * - `state`: estado de conteúdo, com ícone eyeoff antes do texto.
 */
export type UcBadgeVariant = 'counter' | 'role' | 'course' | 'open' | 'state';

/**
 * Badge em pílula. Seletor de elemento; projeta o texto da label.
 *
 * `variant` é uma união tipada obrigatória (valor ausente é erro em dev time) e
 * o template liga exatamente uma classe modificadora do host, mutuamente
 * exclusiva (`uc-badge--counter`, `--role`, `--course`, `--open`, `--state`).
 * Nenhum caminho de código liga duas ao mesmo tempo.
 */
@Component({
  selector: 'uc-badge',
  imports: [UcIcon],
  template: `@if (variant() === 'state') {
      <uc-icon name="eyeoff" size="sm" />
    }<ng-content></ng-content>`,
  styleUrl: './badge.scss',
  host: {
    class: 'uc-badge',
    '[class.uc-badge--counter]': "variant() === 'counter'",
    '[class.uc-badge--role]': "variant() === 'role'",
    '[class.uc-badge--course]': "variant() === 'course'",
    '[class.uc-badge--open]': "variant() === 'open'",
    '[class.uc-badge--state]': "variant() === 'state'",
  },
})
export class UcBadge {
  readonly variant = input.required<UcBadgeVariant>();
}
