import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ToastService } from '../../../ui';
import { tempoRelativo } from '../../publicacoes/tempo-relativo';
import { Notificacao, NotificacoesService } from '../notificacoes.service';

const TAMANHO_PAGINA = 20;

/**
 * Lista completa de notificações (Story 10.2), aberta pelo "Ver todas as notificações" do
 * painel da sininho (ver {@link Shell}). Estado próprio, independente da cache compartilhada
 * de {@link NotificacoesService} — essa cache guarda só a 1ª página pro painel/badge, e
 * paginar aqui por cima dela mostraria a página errada quando o usuário reabrisse o painel.
 */
@Component({
  selector: 'app-notificacoes-lista',
  templateUrl: './notificacoes-lista.html',
  styleUrl: './notificacoes-lista.scss',
})
export class NotificacoesLista {
  private readonly notificacoesService = inject(NotificacoesService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly notificacoes = signal<Notificacao[]>([]);
  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  /** Só o carregamento inicial — troca a tela inteira pela mensagem (nada pra mostrar). */
  protected readonly erro = signal<string | null>(null);
  /** Marcar/excluir já tem lista na tela; o erro aparece junto dela, sem escondê-la. */
  protected readonly erroAcao = signal<string | null>(null);
  protected readonly temMais = signal(false);
  private paginaAtual = 0;

  /** Ids com uma ação (marcar/excluir) em andamento - desabilita só os botões daquele item. */
  protected readonly processando = signal<ReadonlySet<number>>(new Set());

  protected readonly tempoRelativo = tempoRelativo;

  constructor() {
    this.carregar();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.notificacoesService.listarPagina(0, TAMANHO_PAGINA).subscribe({
      next: (pagina) => {
        this.paginaAtual = 0;
        this.notificacoes.set(pagina.content);
        this.temMais.set(pagina.totalPages > 1);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Não foi possível carregar suas notificações agora. Tente novamente em instantes.');
      },
    });
  }

  protected carregarMais(): void {
    if (this.carregandoMais()) {
      return;
    }
    const proxima = this.paginaAtual + 1;
    this.carregandoMais.set(true);
    this.notificacoesService.listarPagina(proxima, TAMANHO_PAGINA).subscribe({
      next: (pagina) => {
        this.paginaAtual = proxima;
        const vistas = new Set(this.notificacoes().map((n) => n.id));
        this.notificacoes.update((atuais) => [...atuais, ...pagina.content.filter((n) => !vistas.has(n.id))]);
        this.temMais.set(proxima + 1 < pagina.totalPages);
        this.carregandoMais.set(false);
      },
      error: () => {
        this.carregandoMais.set(false);
        this.toastService.mostrar('Não foi possível carregar mais notificações agora.');
      },
    });
  }

  /** Clicar no texto - vai pra tela relacionada (se houver) e marca como lida, igual ao painel da sininho. */
  protected selecionar(notificacao: Notificacao): void {
    if (!notificacao.lida) {
      this.marcarComoLida(notificacao);
    }
    if (notificacao.link) {
      this.router.navigateByUrl(notificacao.link).catch(() => {});
    }
  }

  protected marcarComoLida(notificacao: Notificacao): void {
    if (notificacao.lida || this.processando().has(notificacao.id)) {
      return;
    }
    this.executar(notificacao.id, this.notificacoesService.marcarComoLida(notificacao.id), () => {
      this.notificacoes.update((atuais) =>
        atuais.map((n) => (n.id === notificacao.id ? { ...n, lida: true } : n)),
      );
    });
  }

  protected excluir(notificacao: Notificacao): void {
    if (this.processando().has(notificacao.id)) {
      return;
    }
    this.executar(notificacao.id, this.notificacoesService.excluir(notificacao.id), () => {
      this.notificacoes.update((atuais) => atuais.filter((n) => n.id !== notificacao.id));
    });
  }

  private executar(id: number, acao: Observable<void>, aoSucesso: () => void): void {
    this.processando.update((atuais) => new Set(atuais).add(id));
    this.erroAcao.set(null);
    acao.subscribe({
      next: () => {
        this.processando.update((atuais) => {
          const proximo = new Set(atuais);
          proximo.delete(id);
          return proximo;
        });
        aoSucesso();
      },
      error: () => {
        this.processando.update((atuais) => {
          const proximo = new Set(atuais);
          proximo.delete(id);
          return proximo;
        });
        this.erroAcao.set('Não foi possível concluir a ação agora. Tente novamente em instantes.');
      },
    });
  }
}
