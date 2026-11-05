import { Component, input } from '@angular/core';

export type UcAvatarCor = 'marca' | 'marca-suave' | 'neutro' | 'azul' | 'verde' | 'areia' | 'violeta';

const CORES_POR_ID = ['azul', 'verde', 'areia', 'violeta'] as const;

/** Cor estável do avatar a partir do id, em ciclo de 4 (ids 1, 5, 9... dão azul). */
export function corDoAvatar(id: number): Exclude<UcAvatarCor, 'marca' | 'marca-suave' | 'neutro'> {
  return CORES_POR_ID[(((id - 1) % 4) + 4) % 4];
}

/**
 * Avatar de iniciais (KAN-91). Decorativo: as iniciais ficam em aria-hidden e
 * quem usa fornece o nome acessível no contexto.
 */
@Component({
  selector: 'uc-avatar',
  template: '<span aria-hidden="true">{{ iniciais() }}</span>',
  styleUrl: './avatar.scss',
  host: {
    class: 'uc-avatar',
    '[class]': 'classes()',
  },
})
export class UcAvatar {
  readonly iniciais = input.required<string>();
  readonly cor = input<UcAvatarCor>('neutro');
  readonly forma = input<'circulo' | 'quadrado'>('circulo');
  readonly tamanho = input<'sm' | 'md' | 'lg'>('md');

  protected classes(): string {
    return `uc-avatar uc-avatar--${this.cor()} uc-avatar--${this.forma()} uc-avatar--${this.tamanho()}`;
  }
}
