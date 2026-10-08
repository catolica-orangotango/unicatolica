import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const NOME_APP = 'UniCatólica';

/** WCAG 2.4.2: cada tela tem título próprio na aba, no formato "Tela — UniCatólica". */
@Injectable({ providedIn: 'root' })
export class TituloStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const tela = this.buildTitle(snapshot);
    this.title.setTitle(tela ? `${tela} — ${NOME_APP}` : NOME_APP);
  }
}
