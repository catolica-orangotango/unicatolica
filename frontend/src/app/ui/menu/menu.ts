import { Component, ElementRef, Injector, afterNextRender, effect, inject, input, model, output, untracked } from '@angular/core';

/** Item do menu suspenso. */
export interface UcMenuItem {
  id: string;
  rotulo: string;
  /** Ação destrutiva: texto em cor de erro. */
  perigo?: boolean;
  /** Item inerte: `aria-disabled`, não emite nem fecha. */
  desabilitado?: boolean;
}

/**
 * Menu suspenso (KAN-91). Reproduz o dropdown do avatar da casca de forma
 * reutilizável: painel `role="menu"`, itens `role="menuitem"`, foco no
 * primeiro item habilitado ao abrir, setas com volta, Escape e seleção
 * devolvem o foco ao `gatilho`, e perder o foco ou clicar fora fecha sem
 * roubar o foco. O botão que abre o menu é responsabilidade do consumidor.
 */
@Component({
  selector: 'uc-menu',
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
  host: {
    class: 'uc-menu',
    '[class.uc-menu--abaixo]': "direcao() === 'abaixo'",
    '[class.uc-menu--acima]': "direcao() === 'acima'",
    '(document:click)': 'aoClicarFora($event)',
  },
})
export class UcMenu {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly rotulo = input.required<string>();
  readonly itens = input.required<readonly UcMenuItem[]>();
  readonly aberto = model(false);
  readonly direcao = input<'abaixo' | 'acima'>('abaixo');
  /** Elemento que recebe o foco ao fechar por Escape ou seleção. */
  readonly gatilho = input<HTMLElement | null>(null);
  readonly selecionou = output<string>();

  constructor() {
    effect(() => {
      if (this.aberto()) {
        untracked(() =>
          afterNextRender(() => this.itensHabilitados()[0]?.focus(), { injector: this.injector }),
        );
      }
    });
  }

  protected selecionar(item: UcMenuItem): void {
    if (item.desabilitado) {
      return;
    }
    this.selecionou.emit(item.id);
    this.fechar(true);
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      this.fechar(true);
      return;
    }
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') {
      return;
    }
    evento.preventDefault();
    const lista = this.itensHabilitados();
    if (!lista.length) {
      return;
    }
    const atual = lista.indexOf(document.activeElement as HTMLElement);
    const passo = evento.key === 'ArrowDown' ? 1 : -1;
    const proximo = atual < 0 ? 0 : (atual + passo + lista.length) % lista.length;
    lista[proximo].focus();
  }

  /** Foco saindo do painel fecha sem mover o foco (mesmo padrão da casca). */
  protected aoSairFoco(evento: FocusEvent): void {
    const painel = evento.currentTarget as HTMLElement;
    const proximo = evento.relatedTarget as Node | null;
    if (proximo && painel.contains(proximo)) {
      return;
    }
    this.fechar(false);
  }

  protected aoClicarFora(evento: MouseEvent): void {
    if (!this.aberto()) {
      return;
    }
    const alvo = evento.target as Node | null;
    if (alvo && this.gatilho()?.contains(alvo)) {
      return;
    }
    this.fechar(false);
  }

  private fechar(devolverFoco: boolean): void {
    if (!this.aberto()) {
      return;
    }
    this.aberto.set(false);
    if (devolverFoco) {
      this.gatilho()?.focus();
    }
  }

  private itensHabilitados(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'),
    );
  }
}
