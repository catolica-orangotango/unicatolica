import { Component, computed, input, model } from '@angular/core';

/** Uma opção do filtro segmentado; `contador` é opcional. */
export interface UcSegmentedOpcao {
  valor: string;
  rotulo: string;
  contador?: number;
}

/**
 * Filtro segmentado (KAN-91). Grupo de rádios em pílula: `valor` é a opção
 * selecionada (two-way). Clique seleciona; setas, Home e End movem a seleção
 * e o foco (roving tabindex). Se `valor` não casa com nenhuma opção, a
 * primeira fica focável para o grupo continuar acessível por teclado.
 */
@Component({
  selector: 'uc-segmented',
  templateUrl: './segmented.html',
  styleUrl: './segmented.scss',
})
export class UcSegmented {
  readonly rotulo = input.required<string>();
  readonly opcoes = input.required<readonly UcSegmentedOpcao[]>();
  readonly valor = model.required<string>();

  /** Índice focável: o selecionado ou, sem correspondência, o primeiro. */
  protected readonly indiceAtivo = computed(() => {
    const i = this.opcoes().findIndex((o) => o.valor === this.valor());
    return i < 0 ? 0 : i;
  });

  protected selecionar(opcao: UcSegmentedOpcao): void {
    this.valor.set(opcao.valor);
  }

  protected aoTeclar(evento: KeyboardEvent, indice: number): void {
    const total = this.opcoes().length;
    let destino: number;
    switch (evento.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        destino = (indice + 1) % total;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        destino = (indice - 1 + total) % total;
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = total - 1;
        break;
      default:
        return;
    }
    evento.preventDefault();
    this.valor.set(this.opcoes()[destino].valor);
    const grupo = (evento.currentTarget as HTMLElement).parentElement;
    grupo?.querySelectorAll<HTMLElement>('[role="radio"]')[destino]?.focus();
  }
}
