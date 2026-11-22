import { Component, computed, input, signal } from '@angular/core';

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
  template: `
    @if (mostrarFoto(); as url) {
      <img class="uc-avatar__foto" [src]="url" alt="" (error)="falhou.set(url)" />
    } @else {
      <span aria-hidden="true">{{ iniciais() }}</span>
    }
  `,
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
  /** Foto (KAN-128): decorativa como as iniciais (`alt=""`). Sem valor, ou se a imagem falhar, mostra as iniciais. */
  readonly fotoUrl = input<string | null>(null);

  /** Última URL que falhou ao carregar; uma URL nova volta a ser tentada. */
  protected readonly falhou = signal<string | null>(null);
  protected readonly mostrarFoto = computed(() => {
    const url = this.fotoUrl();
    return url && url !== this.falhou() ? url : null;
  });

  protected classes(): string {
    return `uc-avatar uc-avatar--${this.cor()} uc-avatar--${this.forma()} uc-avatar--${this.tamanho()}`;
  }
}
