import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SessaoAtividadeService } from '../../core/auth/sessao-atividade.service';
import { ComunidadesService } from '../../features/comunidades/comunidades.service';
import { ContadorDenuncias } from '../../features/moderacao/contador-denuncias/contador-denuncias';
import { NotificacoesService } from '../../features/notificacoes/notificacoes.service';

/** Um item da navegação global. `path === null` = item ainda sem rota (inerte). */
interface NavItem {
  label: string;
  path: string | null;
  /** Só aparece para MODERADOR / ADMINISTRADOR. */
  privileged?: boolean;
  /** Só true no item "Suas comunidades" — expande a lista dinâmica logo abaixo dele. */
  expandeComunidades?: boolean;
  /** Só true em "Denúncias" — mostra o contador de pendentes (UJ-2, passo 1). */
  contaDenuncias?: boolean;
  /** Só true em "Notificações" — abre o painel (ver {@link Shell.alternarNotificacoes}) em vez de navegar. */
  abrePainelNotificacoes?: boolean;
}

/**
 * Itens da sidebar, na ordem exata da tabela "Navegação global" de
 * EXPERIENCE.md: Denúncias e Solicitações de fixação ficam entre "Criar
 * enquete" e "Suas comunidades", e só aparecem para MODERADOR / ADMINISTRADOR.
 * "Início", "Descobrir comunidades" (Epic 2) e "Denúncias" (Epic 12) têm rota; o resto entra
 * conforme cada epic aterrissa. "Suas comunidades" não vira rota própria —
 * é só o cabeçalho da lista dinâmica (ver {@link Shell.minhasComunidades}).
 */
const NAV_ITENS: readonly NavItem[] = [
  { label: 'Início', path: '/feed' },
  { label: 'Buscar', path: null },
  { label: 'Mensagens', path: null },
  { label: 'Notificações', path: null, abrePainelNotificacoes: true },
  { label: 'Criar enquete', path: null },
  { label: 'Denúncias', path: '/moderacao/denuncias', privileged: true, contaDenuncias: true },
  { label: 'Solicitações de fixação', path: null, privileged: true },
  { label: 'Suas comunidades', path: null, expandeComunidades: true },
  { label: 'Descobrir comunidades', path: '/comunidades' },
];

@Component({
  selector: 'app-shell',
  imports: [ContadorDenuncias, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  host: {
    '(document:keydown.escape)': 'fecharPaineis()',
    '(document:click)': 'fecharPaineis()',
  },
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly notificacoesService = inject(NotificacoesService);

  private readonly avatar = viewChild<ElementRef<HTMLButtonElement>>('avatar');
  private readonly sininho = viewChild<ElementRef<HTMLButtonElement>>('sininho');

  protected readonly navItens = NAV_ITENS;
  protected readonly menuAberto = signal(false);
  protected readonly notificacoesAbertas = signal(false);
  /**
   * "Suas comunidades" (Epic 2) — cache compartilhada do `ComunidadesService`
   * (ver lá): entrar/sair numa comunidade em qualquer tela atualiza isto aqui
   * também, sem precisar recarregar a página.
   */
  protected readonly minhasComunidades = this.comunidadesService.minhasComunidades;

  /** Painel de notificações (Story 10.1) — mesma cache compartilhada do `NotificacoesService`. */
  protected readonly notificacoes = this.notificacoesService.notificacoes;
  protected readonly notificacoesNaoLidas = this.notificacoesService.naoLidas;
  /** Nome acessível do botão de notificações — o badge visual é `aria-hidden`, então a contagem precisa estar aqui. */
  protected readonly rotuloNotificacoes = computed(() => {
    const naoLidas = this.notificacoesNaoLidas();
    return naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : 'Notificações';
  });

  /**
   * Derivado uma única vez (não é um método re-executado por item do `@for`).
   * `possuiPerfil` não é signal, então o `computed` sem dependências avalia na
   * primeira leitura e memoiza - que é exatamente o que queremos aqui.
   */
  protected readonly ehPrivilegiado = computed(
    () => this.auth.possuiPerfil('MODERADOR') || this.auth.possuiPerfil('ADMINISTRADOR'),
  );

  constructor() {
    // Best-effort: a sidebar não é o lugar de mostrar erro de rede — em caso de
    // falha a cache simplesmente fica vazia, sem travar o resto da navegação.
    this.comunidadesService.carregarMinhas().subscribe({ error: () => undefined });
    this.notificacoesService.carregar().subscribe({ error: () => undefined });

    // Sessão por inatividade (KAN-78): só roda enquanto a casca autenticada existe.
    const sessaoAtividade = inject(SessaoAtividadeService);
    sessaoAtividade.iniciar();
    inject(DestroyRef).onDestroy(() => sessaoAtividade.parar());
  }

  protected alternarMenu(evento: Event): void {
    // Impede que o clique borbulhe até o listener `document:click` e feche o
    // menu no mesmo gesto que o abriu.
    evento.stopPropagation();
    this.notificacoesAbertas.set(false);
    this.menuAberto.update((aberto) => !aberto);
  }

  /** Story 10.1 — abre/fecha o painel de notificações; recarrega ao abrir. */
  protected alternarNotificacoes(evento: Event): void {
    evento.stopPropagation();
    this.menuAberto.set(false);
    const vaiAbrir = !this.notificacoesAbertas();
    this.notificacoesAbertas.set(vaiAbrir);
    if (vaiAbrir) {
      this.notificacoesService.carregar().subscribe({ error: () => undefined });
    }
  }

  /**
   * Fecha os dois painéis (menu da conta e notificações) e devolve o foco ao
   * botão que os abriu. Caminho de Escape, clique fora e ativação de item -
   * onde o foco precisa voltar para um lugar previsível.
   */
  protected fecharPaineis(): void {
    if (this.menuAberto()) {
      this.menuAberto.set(false);
      this.avatar()?.nativeElement.focus();
    }
    if (this.notificacoesAbertas()) {
      this.notificacoesAbertas.set(false);
      this.sininho()?.nativeElement.focus();
    }
  }

  /**
   * Fecha o dropdown quando o foco sai dele (ex.: Tab a partir de "Sair"). Não
   * devolve o foco ao avatar: o foco já está indo para outro lugar por vontade
   * do usuário.
   */
  protected aoSairFoco(evento: FocusEvent): void {
    const menu = evento.currentTarget as HTMLElement;
    const proximo = evento.relatedTarget as Node | null;
    if (proximo && menu.contains(proximo)) {
      return;
    }
    this.menuAberto.set(false);
  }

  /** Mesmo padrão de {@link aoSairFoco}, para o painel de notificações. */
  protected aoSairFocoNotificacoes(evento: FocusEvent): void {
    const painel = evento.currentTarget as HTMLElement;
    const proximo = evento.relatedTarget as Node | null;
    if (proximo && painel.contains(proximo)) {
      return;
    }
    this.notificacoesAbertas.set(false);
  }

  /**
   * Clique numa notificação do painel: marca como lida (best-effort — a UI já
   * mostra otimisticamente, então uma falha de rede aqui não trava a
   * navegação) e leva para a tela relacionada, se houver link.
   */
  protected aoClicarNotificacao(notificacao: { id: number; lida: boolean; link: string | null }): void {
    if (!notificacao.lida) {
      this.notificacoesService.marcarComoLida(notificacao.id).subscribe({ error: () => undefined });
    }
    this.notificacoesAbertas.set(false);
    if (notificacao.link) {
      this.router.navigateByUrl(notificacao.link).catch(() => {});
    }
  }

  /** Próprio perfil (Stories 4.1/4.2). */
  protected abrirPerfil(): void {
    this.fecharPaineis();
    this.router.navigateByUrl('/perfil').catch(() => {});
  }

  protected sair(): void {
    this.fecharPaineis();
    this.auth.logout();
    this.router.navigateByUrl('/login').catch(() => {});
  }
}
