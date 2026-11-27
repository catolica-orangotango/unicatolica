import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';
import { UcBadge, UcIcon } from '../../../ui';

/**
 * Botão de sino de notificações (Story 10.2, RN16/RN17): fica sempre imediatamente à esquerda
 * do avatar, nunca na navegação principal. Usado duas vezes na casca - no rodapé da sidebar
 * (desktop) e na barra superior (celular, `ShellTopbar`) - cada instância com o próprio estado
 * de aberto/fechado, decidido por quem a hospeda.
 */
@Component({
  selector: 'app-notificacoes-sininho',
  imports: [UcBadge, UcIcon],
  templateUrl: './notificacoes-sininho.html',
  styleUrl: './notificacoes-sininho.scss',
})
export class NotificacoesSininho {
  private readonly botao = viewChild.required<ElementRef<HTMLButtonElement>>('botao');

  readonly totalNaoLidas = input(0);
  readonly aberta = input(false);
  readonly alternou = output<MouseEvent>();

  /** Nome acessível - o ícone e o badge são `aria-hidden`, então a contagem precisa estar aqui. */
  protected readonly rotulo = computed(() => {
    const total = this.totalNaoLidas();
    return total > 0 ? `Notificações, ${total} não lida${total === 1 ? '' : 's'}` : 'Notificações';
  });

  /** Devolve o foco ao sino (a casca chama ao fechar o painel aberto por ele). */
  focar(): void {
    this.botao().nativeElement.focus();
  }
}
