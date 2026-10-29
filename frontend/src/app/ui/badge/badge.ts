import { Component, input } from '@angular/core';

/** The two community kinds a badge can mark. `course` -> maroon, `open` -> maroon (accent). */
export type UcBadgeVariant = 'course' | 'open';

/**
 * Story 14.2 - community badge (course / open).
 *
 * Element selector; projects its label text. `variant` is a required typed
 * union so a missing value is an Angular dev-time error, and the template
 * binds exactly one of two mutually-exclusive host modifier classes -
 * `uc-badge--course` (maroon text) XOR `uc-badge--open` (maroon text). No code
 * path sets both, so "course colour and open colour never on one badge"
 * (DESIGN.md / epic-14 constraint) holds structurally.
 */
@Component({
  selector: 'uc-badge',
  template: '<ng-content></ng-content>',
  styleUrl: './badge.scss',
  host: {
    class: 'uc-badge',
    '[class.uc-badge--course]': "variant() === 'course'",
    '[class.uc-badge--open]': "variant() === 'open'",
  },
})
export class UcBadge {
  readonly variant = input.required<UcBadgeVariant>();
}
