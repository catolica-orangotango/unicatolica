import { Component, ElementRef, input, model, output, viewChild } from '@angular/core';
import { UcAvatar, UcIcon, UcMenu, type UcAvatarCor, type UcMenuItem } from '../../../ui';
import { NotificacoesSininho } from '../notificacoes-sininho/notificacoes-sininho';

/**
 * Barra superior do celular (KAN-91, `.mtop` de docs/design/kan-84/base.css):
 * marca, o botão "Suas comunidades" que abre a gaveta da casca e, à esquerda do
 * avatar, o sino de notificações (Story 10.2, RN17) com o menu da conta. Só
 * aparece até $uc-bp-mobile. O estado (gaveta, notificações e menu abertos) e
 * as ações ficam na casca, que coordena todos os painéis.
 */
@Component({
  selector: 'app-shell-topbar',
  imports: [NotificacoesSininho, UcAvatar, UcIcon, UcMenu],
  templateUrl: './shell-topbar.html',
  styleUrl: './shell-topbar.scss',
})
export class ShellTopbar {
  private readonly botaoGaveta = viewChild.required<ElementRef<HTMLButtonElement>>('botaoGaveta');
  private readonly avatar = viewChild.required<ElementRef<HTMLButtonElement>>('avatar');
  private readonly sininho = viewChild(NotificacoesSininho);

  /** Gaveta "Suas comunidades" aberta (vai para o `aria-expanded` do botão). */
  readonly gavetaAberta = input(false);
  /** Menu da conta aberto; o UcMenu fecha sozinho por Escape, seleção e clique fora. */
  readonly contaAberta = model(false);
  readonly iniciais = input.required<string>();
  readonly cor = input<UcAvatarCor>('neutro');
  readonly fotoUrl = input<string | null>(null);
  readonly itens = input.required<readonly UcMenuItem[]>();
  /** Story 10.2: estado do sino, decidido pela casca (só um painel por vez). */
  readonly notificacoesTotalNaoLidas = input(0);
  readonly notificacoesAbertas = input(false);

  readonly alternouGaveta = output<MouseEvent>();
  readonly alternouConta = output<MouseEvent>();
  readonly alternouNotificacoes = output<MouseEvent>();
  readonly selecionou = output<string>();

  /** Devolve o foco ao botão "Suas comunidades" (a casca chama ao fechar a gaveta). */
  focarGaveta(): void {
    this.botaoGaveta().nativeElement.focus();
  }

  /** Devolve o foco ao avatar (a casca chama ao fechar o menu da conta). */
  focarConta(): void {
    this.avatar().nativeElement.focus();
  }

  /** Devolve o foco ao sino (a casca chama ao fechar o painel de notificações). */
  focarNotificacoes(): void {
    this.sininho()?.focar();
  }
}
