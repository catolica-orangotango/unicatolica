import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ComunidadesService } from '../../features/comunidades/comunidades.service';
import { ContadorDenuncias } from '../../features/moderacao/contador-denuncias/contador-denuncias';

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
  { label: 'Notificações', path: null },
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
    '(document:keydown.escape)': 'fecharMenu()',
    '(document:click)': 'fecharMenu()',
  },
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly comunidadesService = inject(ComunidadesService);

  private readonly avatar = viewChild<ElementRef<HTMLButtonElement>>('avatar');

  protected readonly navItens = NAV_ITENS;
  protected readonly menuAberto = signal(false);
  /**
   * "Suas comunidades" (Epic 2) — cache compartilhada do `ComunidadesService`
   * (ver lá): entrar/sair numa comunidade em qualquer tela atualiza isto aqui
   * também, sem precisar recarregar a página.
   */
  protected readonly minhasComunidades = this.comunidadesService.minhasComunidades;

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
  }

  protected alternarMenu(evento: Event): void {
    // Impede que o clique borbulhe até o listener `document:click` e feche o
    // menu no mesmo gesto que o abriu.
    evento.stopPropagation();
    this.menuAberto.update((aberto) => !aberto);
  }

  /**
   * Fecha o dropdown e devolve o foco ao avatar. Caminho de Escape, clique
   * fora e ativação de item - onde o foco precisa voltar para um lugar
   * previsível.
   */
  protected fecharMenu(): void {
    if (!this.menuAberto()) {
      return;
    }
    this.menuAberto.set(false);
    this.avatar()?.nativeElement.focus();
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

  /** Próprio perfil (Stories 4.1/4.2). */
  protected abrirPerfil(): void {
    this.fecharMenu();
    this.router.navigateByUrl('/perfil').catch(() => {});
  }

  protected sair(): void {
    this.fecharMenu();
    this.auth.logout();
    this.router.navigateByUrl('/login').catch(() => {});
  }
}
