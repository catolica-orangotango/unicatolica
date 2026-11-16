import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, EMPTY, Subject, combineLatest, debounceTime } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { UcButton, UcEmptyState, UcField, UcInput, UcSkeleton } from '../../../ui';
import type { Pagina } from '../../comunidades/comunidades.service';
import {
  AuditoriaService,
  ConsultaAuditoria,
  FiltrosAuditoria,
  LogAuditoria,
} from '../auditoria.service';

const ESPERA_DETALHES_MS = 300;
const DETALHES_MINIMO = 3;
const ERRO_CARGA = 'Não foi possível carregar os logs agora.';
const ERRO_INTERVALO = 'A data inicial não pode ser depois da data final.';
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Mesmas colunas do filtro, na ordem em que viram parâmetros da URL. */
const CHAVES_TEXTO = ['modulo', 'acao', 'entidadeAfetada', 'detalhes', 'de', 'ate'] as const;

/**
 * Tela "Logs de auditoria" de /admin (KAN-90, RF83). Somente leitura. O estado inteiro (filtros e
 * página) mora na URL: cada mudança navega, e a consulta roda a partir de `queryParamMap`, então
 * recarregar, voltar do navegador ou colar o link reproduz a mesma lista. A página vai 1-based na
 * URL (`pagina=2`) e 0-based na API.
 */
@Component({
  selector: 'app-auditoria-admin',
  imports: [RouterLink, UcButton, UcEmptyState, UcField, UcInput, UcSkeleton],
  templateUrl: './auditoria-admin.html',
  styleUrl: './auditoria-admin.scss',
})
export class AuditoriaAdmin {
  private readonly auditoriaService = inject(AuditoriaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly recarregar$ = new BehaviorSubject<void>(undefined);
  private readonly detalhesDigitados$ = new Subject<string>();
  private readonly formatadorData = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  protected readonly consulta = signal<ConsultaAuditoria>({});
  protected readonly opcoes = signal<FiltrosAuditoria | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly pagina = signal<Pagina<LogAuditoria> | null>(null);
  protected readonly detalhesDigitado = signal('');
  protected readonly filtrosAbertos = signal(false);

  protected readonly erroIntervalo = computed(() => {
    const { de, ate } = this.consulta();
    return de && ate && de > ate ? ERRO_INTERVALO : null;
  });

  protected readonly avisoDetalhes = computed(() => {
    const tamanho = this.detalhesDigitado().trim().length;
    return tamanho > 0 && tamanho < DETALHES_MINIMO ? 'Digite ao menos 3 letras.' : null;
  });

  protected readonly acoesDisponiveis = computed(() => {
    const porModulo = this.opcoes()?.acoesPorModulo ?? {};
    const modulo = this.consulta().modulo;
    if (modulo) return porModulo[modulo] ?? [];
    return [...new Set(Object.values(porModulo).flat())].sort();
  });

  protected readonly temFiltro = computed(() => {
    const c = this.consulta();
    return CHAVES_TEXTO.some((chave) => !!c[chave]) || (c.pagina ?? 0) > 0;
  });

  constructor() {
    this.auditoriaService
      .filtros()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (opcoes) => this.opcoes.set(opcoes),
        // As listas de seleção são conveniência: sem elas a tela ainda consulta.
        error: () => this.opcoes.set({ modulos: [], acoesPorModulo: {}, entidadesAfetadas: [] }),
      });

    combineLatest([this.route.queryParamMap, this.recarregar$])
      .pipe(
        map(([params]) => lerConsulta(params)),
        tap((consulta) => {
          this.consulta.set(consulta);
          // Voltar do navegador ou colar um link muda a URL por fora; um texto curto digitado
          // (ainda sem filtro) não é apagado por outra mudança de filtro.
          const digitado = this.detalhesDigitado().trim();
          const foraDeSincronia = consulta.detalhes
            ? consulta.detalhes !== digitado
            : digitado.length >= DETALHES_MINIMO;
          if (foraDeSincronia) this.detalhesDigitado.set(consulta.detalhes ?? '');
        }),
        switchMap((consulta) => {
          if (this.erroIntervalo()) {
            this.pagina.set(null);
            this.erro.set(null);
            this.carregando.set(false);
            return EMPTY;
          }
          this.carregando.set(true);
          this.erro.set(null);
          return this.auditoriaService.listar(consulta).pipe(
            catchError((erro: HttpErrorResponse) => {
              this.erro.set(
                erro.status === 403 ? 'Você não tem acesso aos logs de auditoria.' : ERRO_CARGA,
              );
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
      });

    this.detalhesDigitados$
      .pipe(debounceTime(ESPERA_DETALHES_MS), takeUntilDestroyed())
      .subscribe((texto) => {
        const limpo = texto.trim();
        this.aplicar({ detalhes: limpo.length >= DETALHES_MINIMO ? limpo : undefined });
      });
  }

  protected alternarFiltros(): void {
    this.filtrosAbertos.update((aberto) => !aberto);
  }

  protected escolherModulo(modulo: string): void {
    const acao = this.consulta().acao;
    const acoes = modulo ? (this.opcoes()?.acoesPorModulo[modulo] ?? []) : null;
    // A lista de ações segue o módulo: uma ação de outro módulo não vale mais.
    this.aplicar({ modulo: modulo || undefined, acao: acoes && acao && !acoes.includes(acao) ? undefined : acao });
  }

  protected escolherAcao(acao: string): void {
    this.aplicar({ acao: acao || undefined });
  }

  protected escolherEntidade(entidade: string): void {
    this.aplicar({ entidadeAfetada: entidade || undefined });
  }

  protected escolherDe(data: string): void {
    this.aplicar({ de: DATA_ISO.test(data) ? data : undefined });
  }

  protected escolherAte(data: string): void {
    this.aplicar({ ate: DATA_ISO.test(data) ? data : undefined });
  }

  protected digitarDetalhes(texto: string): void {
    this.detalhesDigitado.set(texto);
    this.detalhesDigitados$.next(texto);
  }

  protected limpar(): void {
    this.detalhesDigitado.set('');
    this.navegar({});
  }

  protected irParaPagina(numero: number): void {
    this.navegar({ ...this.consulta(), pagina: numero });
  }

  protected tentarDeNovo(): void {
    this.recarregar$.next();
  }

  protected quando(iso: string): string {
    return this.formatadorData.format(new Date(iso)).replace(',', '');
  }

  protected entidade(log: LogAuditoria): string {
    if (!log.entidadeAfetada) return '—';
    return log.entidadeId === null ? log.entidadeAfetada : `${log.entidadeAfetada} #${log.entidadeId}`;
  }

  /** Mudar um filtro volta para a página 1. */
  private aplicar(mudanca: Partial<ConsultaAuditoria>): void {
    this.navegar({ ...this.consulta(), ...mudanca, pagina: 0 });
  }

  private navegar(consulta: ConsultaAuditoria): void {
    const queryParams: Record<string, string> = {};
    for (const chave of CHAVES_TEXTO) {
      const valor = consulta[chave];
      if (valor) queryParams[chave] = valor;
    }
    if ((consulta.pagina ?? 0) > 0) queryParams['pagina'] = String((consulta.pagina ?? 0) + 1);
    void this.router.navigate([], { relativeTo: this.route, queryParams });
  }
}

function lerConsulta(params: ParamMap): ConsultaAuditoria {
  const consulta: ConsultaAuditoria = {};
  for (const chave of ['modulo', 'acao', 'entidadeAfetada', 'detalhes'] as const) {
    const valor = params.get(chave)?.trim();
    if (valor) consulta[chave] = valor;
  }
  for (const chave of ['de', 'ate'] as const) {
    const valor = params.get(chave);
    if (valor && DATA_ISO.test(valor)) consulta[chave] = valor;
  }
  const numero = Number.parseInt(params.get('pagina') ?? '', 10);
  consulta.pagina = Number.isFinite(numero) && numero > 1 ? numero - 1 : 0;
  return consulta;
}
