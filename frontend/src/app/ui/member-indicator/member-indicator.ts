import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { UcButton } from '../button/button';
import { UcIcon } from '../icon/icon';
import { UcMenu, type UcMenuItem } from '../menu/menu';

export type UcMemberIndicatorEstado =
  'nao-membro' | 'entrando' | 'membro' | 'membro-menu' | 'restrito';

/**
 * Indicador de membro (KAN-91): estado do botão "Participar".
 *
 * - `nao-membro`: botão secundário "Participar" (emite `participar`).
 * - `entrando`: o mesmo botão, "Entrando…", com `aria-disabled` (não `disabled`,
 *   para o foco permanecer) e sem emitir.
 * - `membro`: texto verde com ícone check e `label` (padrão `Membro`).
 * - `membro-menu`: botão "Membro" que abre um menu com "Sair" (emite `sair`).
 * - `restrito`: texto "Só para alunos deste curso".
 *
 * Todo estado tem texto: nunca depende só de cor (RNF06).
 */
@Component({
  selector: 'uc-member-indicator',
  imports: [UcButton, UcIcon, UcMenu],
  templateUrl: './member-indicator.html',
  styleUrl: './member-indicator.scss',
})
export class UcMemberIndicator {
  readonly estado = input<UcMemberIndicatorEstado>('membro');
  /**
   * Texto do estado `membro`. Vazio ou só espaço cai para `Membro`, para que o
   * estado nunca fique só na cor.
   */
  readonly label = input('Membro', {
    transform: (value: string): string => (value?.trim() ? value : 'Membro'),
  });
  readonly participar = output<void>();
  readonly sair = output<void>();

  /** Botão do menu: o UcMenu precisa dele como `gatilho` (clique fora e foco). */
  protected readonly gatilho = viewChild('botaoMenu', { read: ElementRef<HTMLElement> });
  protected readonly menuAberto = signal(false);
  protected readonly itensMenu: readonly UcMenuItem[] = [
    { id: 'sair', rotulo: 'Sair', perigo: true },
  ];

  protected aoParticipar(): void {
    if (this.estado() === 'nao-membro') {
      this.participar.emit();
    }
  }
}
