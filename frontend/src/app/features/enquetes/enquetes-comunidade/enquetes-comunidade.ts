import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UcCard } from '../../../ui';
import { iniciais, tempoRelativo } from '../../publicacoes/tempo-relativo';
import { Enquete, EnquetesService } from '../enquetes.service';

/**
 * Enquetes de uma comunidade (Story 8.1), na "Home da comunidade". Só leitura: voto (8.3) e
 * resultado (8.5) ainda não existem. Sem enquete, não ocupa espaço na tela.
 */
@Component({
  selector: 'app-enquetes-comunidade',
  imports: [RouterLink, UcCard],
  templateUrl: './enquetes-comunidade.html',
  styleUrl: './enquetes-comunidade.scss',
})
export class EnquetesComunidade {
  private readonly enquetesService = inject(EnquetesService);

  readonly comunidadeId = input.required<number>();

  protected readonly enquetes = signal<Enquete[]>([]);
  protected readonly erro = signal(false);
  protected readonly iniciais = iniciais;
  protected readonly tempoRelativo = tempoRelativo;

  constructor() {
    effect(() => {
      const id = this.comunidadeId();
      untracked(() => this.carregar(id));
    });
  }

  private carregar(comunidadeId: number): void {
    this.erro.set(false);
    this.enquetesService.listarDaComunidade(comunidadeId).subscribe({
      next: (pagina) => this.enquetes.set(pagina.content),
      error: () => {
        this.enquetes.set([]);
        this.erro.set(true);
      },
    });
  }

  protected descricaoDoTipo(enquete: Enquete): string {
    return enquete.tipo === 'MULTIPLA'
      ? `Escolha múltipla, até ${enquete.limiteSelecao} opções`
      : 'Escolha única';
  }
}
