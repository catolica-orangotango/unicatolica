import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { BehaviorSubject, EMPTY, combineLatest } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { UcButton, UcEmptyState, UcIcon, UcSkeleton } from '../../../ui';
import { tempoRelativo } from '../../publicacoes/tempo-relativo';
import { Notificacao, NotificacoesService, PaginaNotificacoes } from '../notificacoes.service';

const TAMANHO = 20;
const ERRO_CARGA = 'Não foi possível carregar as notificações agora.';

/**
 * Página `/notificacoes` (Story 10.2, RF69.2): lista completa, 20 por página, mais recentes
 * primeiro, não lidas destacadas sem reordenar. A página mora na URL (`?pagina=2`) - o mesmo
 * padrão de `AuditoriaAdmin` - então recarregar ou colar o link reproduz a mesma lista.
 */
@Component({
  selector: 'app-notificacoes-lista',
  imports: [UcButton, UcEmptyState, UcIcon, UcSkeleton],
  templateUrl: './notificacoes-lista.html',
  styleUrl: './notificacoes-lista.scss',
})
export class NotificacoesLista {
  private readonly notificacoesService = inject(NotificacoesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly recarregar$ = new BehaviorSubject<void>(undefined);
  private readonly raiz = viewChild<ElementRef<HTMLElement>>('raiz');
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  /** `undefined` = nenhuma exclusão pendente; `'titulo'` = exclusão sem item vizinho sobrando. */
  private focoPendente: number | 'titulo' | undefined;

  protected readonly pagina = signal<PaginaNotificacoes | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly temNaoLidas = computed(() => (this.pagina()?.totalNaoLidas ?? 0) > 0);

  constructor() {
    combineLatest([this.route.queryParamMap, this.recarregar$])
      .pipe(
        map(([params]) => lerPagina(params)),
        switchMap((pagina) => {
          this.carregando.set(true);
          this.erro.set(null);
          return this.notificacoesService.listar(pagina, TAMANHO).pipe(
            catchError(() => {
              this.erro.set(ERRO_CARGA);
              this.carregando.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        this.pagina.set(resultado);
        this.carregando.set(false);
        this.aplicarFocoPendente();
      });

    // RN20: notificação nova recarrega a página atual (sem resetar para a 1ª).
    this.notificacoesService.notificacaoNova$.pipe(takeUntilDestroyed()).subscribe(() => this.recarregar$.next());
  }

  protected irParaPagina(numero: number): void {
    this.navegar(numero);
  }

  protected tentarDeNovo(): void {
    this.recarregar$.next();
  }

  protected quando(iso: string): string {
    return tempoRelativo(iso);
  }

  protected marcarTodasComoLidas(): void {
    this.notificacoesService.marcarTodasComoLidas().subscribe({
      next: () => this.recarregar$.next(),
      error: () => undefined,
    });
  }

  protected aoClicar(notificacao: Notificacao): void {
    if (!notificacao.lida) {
      this.notificacoesService.marcarComoLida(notificacao.id).subscribe({ error: () => undefined });
    }
    if (notificacao.link) {
      this.router.navigateByUrl(notificacao.link).catch(() => {});
    }
  }

  /** RF84.3/RN08: recarrega a página atual; se ficar vazia e não for a 1ª, volta para a anterior. */
  protected excluir(evento: Event, notificacao: Notificacao): void {
    evento.stopPropagation();
    const atual = this.pagina();
    if (!atual) return;
    const indice = atual.content.findIndex((n) => n.id === notificacao.id);
    const proximo = atual.content[indice + 1] ?? atual.content[indice - 1];
    this.focoPendente = proximo ? proximo.id : 'titulo';
    const ficaVazia = atual.content.length === 1 && atual.page > 0;
    const novaPagina = ficaVazia ? atual.page - 1 : atual.page;

    this.notificacoesService.excluir(notificacao.id).subscribe({
      next: () => (novaPagina === atual.page ? this.recarregar$.next() : this.navegar(novaPagina)),
      error: () => undefined,
    });
  }

  /** Foco após excluir (RNF06): o item seguinte/anterior, ou o título sem nenhum sobrando. */
  private aplicarFocoPendente(): void {
    const alvo = this.focoPendente;
    this.focoPendente = undefined;
    if (alvo === undefined) return;
    setTimeout(() => {
      const raiz = this.raiz()?.nativeElement;
      const elemento =
        alvo === 'titulo' ? null : raiz?.querySelector<HTMLElement>(`[data-notificacao-id="${alvo}"] button`);
      (elemento ?? this.titulo()?.nativeElement)?.focus();
    });
  }

  private navegar(pagina: number): void {
    const queryParams = pagina > 0 ? { pagina: pagina + 1 } : {};
    void this.router.navigate([], { relativeTo: this.route, queryParams });
  }
}

function lerPagina(params: ParamMap): number {
  const numero = Number.parseInt(params.get('pagina') ?? '', 10);
  return Number.isFinite(numero) && numero > 1 ? numero - 1 : 0;
}
