import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SessaoAtividadeService } from '../../core/auth/sessao-atividade.service';
import { ComunidadesService } from '../../features/comunidades/comunidades.service';
import { ContadorDenuncias } from '../../features/moderacao/contador-denuncias/contador-denuncias';
import { UsuarioService } from '../../features/identidade/usuario.service';
import { NotificacoesService } from '../../features/notificacoes/notificacoes.service';
import { iniciais } from '../../features/publicacoes/tempo-relativo';
import { UcAvatar, UcBadge, UcIcon, UcMenu, corDoAvatar, type UcIconName, type UcMenuItem } from '../../ui';
import { ShellLateralService } from './shell-lateral.service';
import { ShellTabbar } from './shell-tabbar/shell-tabbar';
import { ShellTopbar } from './shell-topbar/shell-topbar';

/** Um item do menu principal. */
interface NavItem {
  label: string;
  icone: UcIconName;
  /** Rota do item; `null` só em "Notificações", que abre o painel em vez de navegar. */
  path: string | null;
  /** Só aparece para MODERADOR / ADMINISTRADOR. */
  privileged?: boolean;
  /** Só aparece para ADMINISTRADOR. */
  somenteAdministrador?: boolean;
  /** Só true em "Denúncias": mostra o contador de pendentes (UJ-2, passo 1). */
  contaDenuncias?: boolean;
  /** Só true em "Notificações": abre o painel (ver {@link Shell.alternarNotificacoes}) em vez de navegar. */
  abrePainelNotificacoes?: boolean;
}

/** Um item inerte da seção "Em breve": visível desde já, mas sem rota. */
interface ItemEmBreve {
  label: string;
  privileged?: boolean;
}

/**
 * Menu principal do redesign (KAN-91, docs/design/kan-84/inicio-*.html), na
 * ordem aprovada: Início, Comunidades, Denúncias (moderador e administrador),
 * Notificações, Perfil e Administração (só administrador).
 */
const NAV_ITENS: readonly NavItem[] = [
  { label: 'Início', icone: 'home', path: '/feed' },
  { label: 'Comunidades', icone: 'users', path: '/comunidades' },
  { label: 'Denúncias', icone: 'flag', path: '/moderacao/denuncias', privileged: true, contaDenuncias: true },
  { label: 'Notificações', icone: 'bell', path: null, abrePainelNotificacoes: true },
  { label: 'Perfil', icone: 'user', path: '/perfil' },
  { label: 'Administração', icone: 'shield', path: '/admin', somenteAdministrador: true },
];

/** Seção "Em breve": funcionalidades previstas, ainda sem tela (itens inertes). */
const ITENS_EM_BREVE: readonly ItemEmBreve[] = [
  { label: 'Busca' },
  { label: 'Mensagens' },
  { label: 'Criar enquete' },
  { label: 'Solicitações de fixação', privileged: true },
];

/** Itens do menu do cartão da conta (UcMenu, abre para cima). */
const ITENS_CONTA: readonly UcMenuItem[] = [
  { id: 'perfil', rotulo: 'Perfil' },
  { id: 'configuracoes', rotulo: 'Configurações', desabilitado: true },
  { id: 'sair', rotulo: 'Sair' },
];

/** Conectivos que não entram nas iniciais ("Engenharia de Software" vira ES, como no mockup). */
const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** Iniciais do avatar de uma comunidade: primeira letra das duas primeiras palavras, sem conectivos. */
function iniciaisDaComunidade(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter((parte) => !CONECTIVOS.has(parte.toLowerCase()))
    .slice(0, 2)
    .map((parte) => parte[0] ?? '')
    .join('')
    .toUpperCase();
}

/** Rota filha mais profunda ativada marca `data.largo` (telas de trabalho em menu + 1040px). */
function rotaAtualELarga(router: Router): boolean {
  let rota: ActivatedRouteSnapshot | null = router.routerState.snapshot.root;
  while (rota?.firstChild) {
    rota = rota.firstChild;
  }
  return rota?.data['largo'] === true;
}

@Component({
  selector: 'app-shell',
  imports: [
    ContadorDenuncias,
    NgTemplateOutlet,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ShellTabbar,
    ShellTopbar,
    UcAvatar,
    UcBadge,
    UcIcon,
    UcMenu,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  host: {
    '(document:keydown.escape)': 'fecharPaineis()',
    '(document:click)': 'fecharPaineis()',
    '[class.shell--larga]': 'larga()',
  },
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly notificacoesService = inject(NotificacoesService);

  private readonly topbar = viewChild(ShellTopbar);
  private readonly tabbar = viewChild(ShellTabbar);
  private readonly sininho = viewChild<ElementRef<HTMLButtonElement>>('sininho');
  private readonly sidebarNav = viewChild<ElementRef<HTMLElement>>('sidebarNav');
  private readonly cartaoConta = viewChild<ElementRef<HTMLButtonElement>>('cartaoConta');

  protected readonly navItens = NAV_ITENS;
  protected readonly itensConta = ITENS_CONTA;
  protected readonly iniciaisDaComunidade = iniciaisDaComunidade;
  protected readonly corDoAvatar = corDoAvatar;
  /** Menu da conta do avatar da barra superior do celular. */
  protected readonly menuAberto = signal(false);
  /** Menu do cartão da conta, no rodapé da <nav>. */
  protected readonly contaAberta = signal(false);
  /**
   * Telas de trabalho (descobrir, fila, admin) usam menu + 1040px sem coluna
   * lateral: a rota filha ativa marca `data: { largo: true }` em app.routes.ts.
   */
  protected readonly larga = signal(false);
  /** Conteúdo da coluna lateral, registrado pela tela ativa (ver {@link ShellLateralService}). */
  protected readonly lateral = inject(ShellLateralService).template;
  /** Nome do usuário para o cartão da conta; `null` até `GET /usuarios/me` responder (ou se falhar). */
  protected readonly nomeUsuario = signal<string | null>(null);
  protected readonly notificacoesAbertas = signal(false);
  /**
   * Quem abriu o painel de notificações: o item do menu lateral ou a aba do
   * celular. Decide onde o painel (um só) é desenhado e para onde o foco volta.
   */
  protected readonly origemNotificacoes = signal<'lateral' | 'abas'>('lateral');
  /**
   * Gaveta "Suas comunidades" do celular (Story 14.4, KAN-91) - sem efeito acima
   * do breakpoint, onde a sidebar já é visível.
   */
  protected readonly navAberto = signal(false);
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

  protected readonly ehAdministrador = computed(() => this.auth.possuiPerfil('ADMINISTRADOR'));

  protected readonly itensEmBreve = computed(() =>
    ITENS_EM_BREVE.filter((item) => !item.privileged || this.ehPrivilegiado()),
  );

  /** Papel exibido no cartão da conta. */
  protected readonly papel = computed(() =>
    this.ehAdministrador() ? 'Administrador' : this.auth.possuiPerfil('MODERADOR') ? 'Moderador' : 'Aluno',
  );

  /** Iniciais do nome; sem nome, a inicial do papel (nunca um "?"). */
  protected readonly iniciaisDaConta = computed(() => {
    const nome = this.nomeUsuario();
    return nome ? iniciais(nome) : this.papel()[0];
  });

  protected readonly corDaConta = computed(() => {
    const id = this.auth.usuarioId();
    return id === null ? 'neutro' : corDoAvatar(id);
  });

  constructor() {
    // Best-effort: a sidebar não é o lugar de mostrar erro de rede — em caso de
    // falha a cache simplesmente fica vazia, sem travar o resto da navegação.
    this.comunidadesService.carregarMinhas().subscribe({ error: () => undefined });
    this.notificacoesService.carregar().subscribe({ error: () => undefined });
    // Mesmo padrão para o nome do cartão da conta: o JWT só traz id e papéis.
    inject(UsuarioService)
      .me()
      .subscribe({ next: (usuario) => this.nomeUsuario.set(usuario.nome), error: () => undefined });

    this.larga.set(rotaAtualELarga(this.router));
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.larga.set(rotaAtualELarga(this.router)));

    // Sessão por inatividade (KAN-78): só roda enquanto a casca autenticada existe.
    const sessaoAtividade = inject(SessaoAtividadeService);
    sessaoAtividade.iniciar();
    inject(DestroyRef).onDestroy(() => sessaoAtividade.parar());
  }

  /** Abre/fecha o menu da conta do avatar da barra superior; fecha os outros painéis. */
  protected alternarMenu(evento: Event): void {
    // Impede que o clique borbulhe até o listener `document:click` e feche o
    // menu no mesmo gesto que o abriu.
    evento.stopPropagation();
    this.notificacoesAbertas.set(false);
    this.navAberto.set(false);
    this.contaAberta.set(false);
    this.menuAberto.update((aberto) => !aberto);
  }

  /** Abre/fecha o menu do cartão da conta; fecha os outros painéis. */
  protected alternarConta(evento: Event): void {
    evento.stopPropagation();
    this.menuAberto.set(false);
    this.notificacoesAbertas.set(false);
    this.contaAberta.update((aberta) => !aberta);
  }

  /** Item escolhido no menu da conta, do cartão ou da barra superior (Configurações é inerte e nem chega aqui). */
  protected aoSelecionarConta(id: string): void {
    if (id === 'perfil') {
      this.abrirPerfil();
    } else if (id === 'sair') {
      this.sair();
    }
  }

  /** Story 14.4 - abre/fecha a gaveta "Suas comunidades" (abaixo do breakpoint). */
  protected alternarNav(evento: Event): void {
    evento.stopPropagation();
    this.menuAberto.set(false);
    this.contaAberta.set(false);
    this.notificacoesAbertas.set(false);
    this.navAberto.update((aberto) => !aberto);
  }

  /**
   * Prende o foco dentro da gaveta enquanto ela está aberta (Story 14.4,
   * WCAG 2.2 AA) - Tab no último item volta ao primeiro, Shift+Tab no
   * primeiro vai ao último. Sem efeito acima do breakpoint: lá a gaveta nunca
   * abre (a barra superior fica `display: none`), então `navAberto()` só vira
   * `true` por um clique que, nesse layout, não existe. No celular a gaveta
   * esconde por CSS os itens de navegação, "Em breve" e o cartão da conta; o
   * filtro por `checkVisibility()` deixa esses itens fora do ciclo de foco.
   */
  protected aoTeclarNaGaveta(evento: KeyboardEvent): void {
    if (evento.key !== 'Tab' || !this.navAberto()) {
      return;
    }
    const nav = this.sidebarNav()?.nativeElement;
    const focaveis = nav
      ? [...nav.querySelectorAll<HTMLElement>('a, button')].filter((el) => el.checkVisibility?.() ?? true)
      : [];
    if (focaveis.length === 0) {
      return;
    }
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  /**
   * Story 10.1: abre/fecha o painel de notificações; recarrega ao abrir.
   * `origem` é o botão que o abriu: o item do menu lateral ou a aba do celular.
   */
  protected alternarNotificacoes(evento: Event, origem: 'lateral' | 'abas' = 'lateral'): void {
    evento.stopPropagation();
    this.menuAberto.set(false);
    this.contaAberta.set(false);
    this.navAberto.set(false);
    this.origemNotificacoes.set(origem);
    const vaiAbrir = !this.notificacoesAbertas();
    this.notificacoesAbertas.set(vaiAbrir);
    if (vaiAbrir) {
      this.notificacoesService.carregar().subscribe({ error: () => undefined });
    }
  }

  /**
   * Fecha os painéis (menus da conta, notificações e gaveta) e devolve o foco ao
   * botão que os abriu. Caminho de Escape, clique fora e ativação de item -
   * onde o foco precisa voltar para um lugar previsível.
   */
  protected fecharPaineis(): void {
    if (this.menuAberto()) {
      this.menuAberto.set(false);
      this.topbar()?.focarConta();
    }
    if (this.contaAberta()) {
      this.contaAberta.set(false);
      this.cartaoConta()?.nativeElement.focus();
    }
    if (this.notificacoesAbertas()) {
      this.notificacoesAbertas.set(false);
      if (this.origemNotificacoes() === 'abas') {
        this.tabbar()?.focarNotificacoes();
      } else {
        this.sininho()?.nativeElement.focus();
      }
    }
    if (this.navAberto()) {
      this.navAberto.set(false);
      this.topbar()?.focarGaveta();
    }
  }

  /**
   * Fecha o painel de notificações quando o foco sai dele (ex.: Tab a partir do
   * último item), sem devolver o foco: ele já está indo para outro lugar.
   */
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
