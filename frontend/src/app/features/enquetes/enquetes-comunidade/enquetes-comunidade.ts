import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService, UcButton, UcCard } from '../../../ui';
import { iniciais, tempoRelativo } from '../../publicacoes/tempo-relativo';
import { Enquete, EnquetesService } from '../enquetes.service';

/**
 * Enquetes de uma comunidade (Stories 8.1, 8.3 e 8.5), na "Home da comunidade": lista, voto e resultado. O membro que
 * ainda não votou escolhe a opção (uma em escolha única; até o limite em múltipla) e vota uma vez
 * (RF56, RF56.1); não membro vê as opções com o aviso (RF55.1). Depois de votar, o resultado consolidado
 * só aparece com o mínimo de votos (RF58.1); antes disso a tela diz "X de 5 necessários". Sem enquete, não
 * ocupa espaço na tela.
 */
@Component({
  selector: 'app-enquetes-comunidade',
  imports: [RouterLink, UcButton, UcCard],
  templateUrl: './enquetes-comunidade.html',
  styleUrl: './enquetes-comunidade.scss',
})
export class EnquetesComunidade {
  private readonly enquetesService = inject(EnquetesService);
  private readonly toastService = inject(ToastService);

  readonly comunidadeId = input.required<number>();
  /** Só membro vota (RF55.1). A Home da comunidade já sabe se o usuário é membro. */
  readonly souMembro = input(false);

  protected readonly enquetes = signal<Enquete[]>([]);
  protected readonly erro = signal(false);
  protected readonly iniciais = iniciais;
  protected readonly tempoRelativo = tempoRelativo;

  /** Opções marcadas, por enquete, antes de enviar. */
  private readonly escolhas = signal<Record<number, number[]>>({});
  /** Enquetes em que este usuário votou nesta tela (soma ao `jaVotei` que veio da lista). */
  private readonly votadas = signal<ReadonlySet<number>>(new Set());
  protected readonly votando = signal<ReadonlySet<number>>(new Set());
  protected readonly erros = signal<Record<number, string>>({});

  constructor() {
    effect(() => {
      const id = this.comunidadeId();
      untracked(() => this.carregar(id));
    });
  }

  private carregar(comunidadeId: number): void {
    this.escolhas.set({});
    this.votadas.set(new Set());
    this.erros.set({});
    this.buscar(comunidadeId);
  }

  private buscar(comunidadeId: number): void {
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

  protected votosDaOpcao(enquete: Enquete, opcaoId: number): number {
    return enquete.resultado?.opcoes.find((o) => o.opcaoId === opcaoId)?.votos ?? 0;
  }

  protected percentual(enquete: Enquete, opcaoId: number): number {
    const total = enquete.resultado?.totalVotantes ?? 0;
    return total === 0 ? 0 : Math.round((this.votosDaOpcao(enquete, opcaoId) / total) * 100);
  }

  protected jaVotou(enquete: Enquete): boolean {
    return enquete.jaVotei || this.votadas().has(enquete.id);
  }

  protected escolhida(enquete: Enquete, opcaoId: number): boolean {
    return (this.escolhas()[enquete.id] ?? []).includes(opcaoId);
  }

  protected totalEscolhido(enquete: Enquete): number {
    return (this.escolhas()[enquete.id] ?? []).length;
  }

  /** Em múltipla, com o limite atingido, as opções ainda não marcadas ficam desabilitadas (RF54.2). */
  protected desabilitada(enquete: Enquete, opcaoId: number): boolean {
    return (
      enquete.tipo === 'MULTIPLA' &&
      !this.escolhida(enquete, opcaoId) &&
      this.totalEscolhido(enquete) >= (enquete.limiteSelecao ?? 0)
    );
  }

  protected marcar(enquete: Enquete, opcaoId: number, marcada: boolean): void {
    const atuais = this.escolhas()[enquete.id] ?? [];
    let novas: number[];
    if (enquete.tipo === 'UNICA') {
      novas = marcada ? [opcaoId] : [];
    } else {
      novas = marcada ? [...atuais.filter((id) => id !== opcaoId), opcaoId] : atuais.filter((id) => id !== opcaoId);
    }
    this.escolhas.update((todas) => ({ ...todas, [enquete.id]: novas }));
    this.erros.update(({ [enquete.id]: _removido, ...resto }) => resto);
  }

  protected votar(enquete: Enquete): void {
    const opcaoIds = this.escolhas()[enquete.id] ?? [];
    if (opcaoIds.length === 0) {
      this.erros.update((todos) => ({ ...todos, [enquete.id]: 'Escolha uma opção para votar.' }));
      return;
    }

    this.votando.update((ids) => new Set(ids).add(enquete.id));
    this.enquetesService.votar(enquete.id, opcaoIds).subscribe({
      next: () => {
        this.terminarEnvio(enquete.id);
        this.votadas.update((ids) => new Set(ids).add(enquete.id));
        this.toastService.mostrar('Voto registrado');
        // O resultado depende do total de votos, que só o servidor sabe: busca de novo, sem limpar a tela.
        this.buscar(this.comunidadeId());
      },
      error: (erro: HttpErrorResponse) => {
        this.terminarEnvio(enquete.id);
        const mensagem: unknown = erro.error?.error?.message;
        const codigo: unknown = erro.error?.error?.code;
        if (codigo === 'JA_VOTOU') {
          // Votou em outra aba ou aparelho: a tela passa a mostrar o estado real.
          this.votadas.update((ids) => new Set(ids).add(enquete.id));
          return;
        }
        const conhecido = [403, 404, 409, 422].includes(erro.status) && typeof mensagem === 'string';
        this.erros.update((todos) => ({
          ...todos,
          [enquete.id]: conhecido ? mensagem : 'Não foi possível registrar o voto agora. Tente novamente em instantes.',
        }));
      },
    });
  }

  private terminarEnvio(enqueteId: number): void {
    this.votando.update((ids) => {
      const restantes = new Set(ids);
      restantes.delete(enqueteId);
      return restantes;
    });
  }
}
