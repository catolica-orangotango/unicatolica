import { Component } from '@angular/core';

/**
 * Story 14.2 - strong-action button (the only one in the system).
 *
 * Attribute selector on a real `<button>`: `<button uc-button>`. Keeping it on
 * the native element (not a wrapper) preserves native `type` / `disabled` /
 * form participation / focus - the accessibility floor. No inputs and no
 * secondary / ghost / size / tone variant (DESIGN.md lists none); the consumer
 * uses native `type` and `disabled` directly.
 *
 * Styling (see button.scss): maroon fill, surface text, pill; a visible
 * `--uc-color-maroon` keyboard-focus outline via `:focus-visible`; dim +
 * `cursor: not-allowed` while `[disabled]`.
 */
@Component({
  selector: 'button[uc-button]',
  template: '<ng-content></ng-content>',
  styleUrl: './button.scss',
  host: { class: 'uc-button' },
})
export class UcButton {}
