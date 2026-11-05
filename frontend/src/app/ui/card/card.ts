import { Component } from '@angular/core';

/**
 * Story 14.2 - generic content card.
 *
 * `surface` fill + 1px `border` + `--uc-radius-xl` + `--uc-space-card-padding`,
 * per DESIGN.md "Components" / "Elevation & Depth" (border, never shadow).
 * No inputs: it only frames whatever content a feature epic projects into it.
 */
@Component({
  selector: 'uc-card',
  template: '<ng-content></ng-content>',
  styleUrl: './card.scss',
})
export class UcCard {}
