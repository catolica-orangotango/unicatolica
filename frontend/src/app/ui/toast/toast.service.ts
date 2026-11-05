import { Injectable, signal } from '@angular/core';

/**
 * Story 14.5 - fixed auto-dismiss duration for every toast.
 *
 * A plain exported TS constant, not a design token: DESIGN.md has no
 * duration token, and this is a behavioural timing value, not a visual one.
 */
export const TOAST_DURACAO_MS = 4000;

export type ToastTipo = 'sucesso' | 'erro';

/** Ação opcional do toast (ex.: "Desfazer", "Tentar de novo"). */
export interface ToastAcao {
  readonly rotulo: string;
  readonly aoAcionar: () => void;
}

export interface ToastOpcoes {
  readonly tipo?: ToastTipo;
  readonly acao?: ToastAcao;
}

/** A single queued toast. `id` is a monotonic in-memory counter, used as the `@for` track key. */
export interface ToastItem {
  readonly id: number;
  readonly mensagem: string;
  readonly tipo: ToastTipo;
  readonly acao?: ToastAcao;
  /** Elemento que tinha o foco quando o toast apareceu (para devolver o foco ao dispensar). */
  readonly origem: HTMLElement | null;
}

/**
 * Fila de toasts baseada em signal (Story 14.5, redesign KAN-91).
 *
 * `mostrar(mensagem, opcoes?)` adiciona uma mensagem não vazia e agenda a
 * própria remoção após `TOAST_DURACAO_MS`. `dispensar` remove na hora;
 * `pausar`/`retomar` suspendem e reiniciam o timer (usado quando o foco
 * entra e sai do toast).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  #proximoId = 0;
  readonly #itens = signal<ToastItem[]>([]);
  readonly #timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly toasts = this.#itens.asReadonly();

  mostrar(mensagem: string, opcoes?: ToastOpcoes): void {
    const texto = (mensagem ?? '').trim();
    if (!texto) {
      return;
    }

    const ativo = document.activeElement;
    const origem = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null;

    const id = this.#proximoId++;
    this.#itens.update((itens) => [
      ...itens,
      { id, mensagem: texto, tipo: opcoes?.tipo ?? 'sucesso', acao: opcoes?.acao, origem },
    ]);
    this.retomar(id);
  }

  dispensar(id: number): void {
    this.pausar(id);
    this.#itens.update((itens) => itens.filter((item) => item.id !== id));
  }

  pausar(id: number): void {
    const timer = this.#timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.#timers.delete(id);
    }
  }

  retomar(id: number): void {
    this.pausar(id);
    if (!this.#itens().some((item) => item.id === id)) {
      return;
    }
    this.#timers.set(
      id,
      setTimeout(() => this.dispensar(id), TOAST_DURACAO_MS),
    );
  }
}
