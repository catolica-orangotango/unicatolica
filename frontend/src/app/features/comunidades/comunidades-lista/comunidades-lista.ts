import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Comunidade, ComunidadesService, Pagina } from '../comunidades.service';
import { UcBadge, UcButton, UcCard, UcMemberIndicator } from '../../../ui';

const TAMANHO_PAGINA = 12;

/**
 * "Descobrir comunidades" (Story 2.5, RF27/RF28) — renderiza dentro do `Shell`
 * (`layout/shell/`), que já cobre navegação global. Lista/filtra todas as comunidades e
 * permite entrar/sair das abertas (Story 2.4). `GET /comunidades` nunca informa
 * `souMembro` (é sempre null na listagem — só o detalhe de uma comunidade preenche),
 * então o estado de "já é membro" é calculado aqui cruzando com a cache compartilhada
 * `ComunidadesService.minhasComunidades` (a mesma que a sidebar usa).
 */
@Component({
  selector: 'app-comunidades-lista',
  // FormsModule só por causa do NgForm/(ngSubmit) — sem ele o <form> não tem o
  // preventDefault() automático e o clique em "Filtrar" vira um submit HTML nativo
  // de verdade (reload da página). Achado ao validar isto ao vivo com Playwright.
  imports: [FormsModule, RouterLink, UcBadge, UcButton, UcCard, UcMemberIndicator],
  templateUrl: './comunidades-lista.html',
  styleUrl: './comunidades-lista.scss',
})
export class ComunidadesLista {
  private readonly comunidadesService = inject(ComunidadesService);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly pagina = signal<Pagina<Comunidade> | null>(null);
  protected readonly processandoId = signal<number | null>(null);

  protected readonly filtroTipo = signal<'' | 'CURSO' | 'ABERTA'>('');
  protected readonly filtroNome = signal('');
  protected readonly paginaAtual = signal(0);

  private readonly minhasIds = computed(
    () => new Set(this.comunidadesService.minhasComunidades().map((comunidade) => comunidade.id)),
  );

  constructor() {
    this.carregar();
  }

  /** `tipo` chega como string solta do `<select>` — o template não faz cast de tipo. */
  protected aplicarFiltro(tipo: string, nome: string): void {
    this.filtroTipo.set(tipo === 'CURSO' || tipo === 'ABERTA' ? tipo : '');
    this.filtroNome.set(nome);
    this.paginaAtual.set(0);
    this.carregar();
  }

  protected irParaPagina(numero: number): void {
    this.paginaAtual.set(numero);
    this.carregar();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.comunidadesService
      .listar({
        tipo: this.filtroTipo() || undefined,
        nome: this.filtroNome() || undefined,
        pagina: this.paginaAtual(),
        tamanho: TAMANHO_PAGINA,
      })
      .subscribe({
        next: (pagina) => {
          this.pagina.set(pagina);
          this.carregando.set(false);
        },
        error: () => {
          this.carregando.set(false);
          this.erro.set('Não foi possível carregar as comunidades agora. Tente novamente em instantes.');
        },
      });
  }

  protected souMembro(comunidade: Comunidade): boolean {
    return this.minhasIds().has(comunidade.id);
  }

  /**
   * Story 2.4 (RF24/RF25) — só comunidades abertas aceitam ingresso por aqui.
   * `ComunidadesService.ingressar()` já recarrega a cache de "minhas comunidades"
   * (sidebar inclusa) — `souMembro()` reflete isso sozinho, nada a atualizar aqui.
   */
  protected ingressar(comunidade: Comunidade): void {
    if (this.processandoId() !== null) {
      return;
    }

    this.processandoId.set(comunidade.id);
    this.comunidadesService.ingressar(comunidade.id, comunidade.nome).subscribe({
      next: () => this.processandoId.set(null),
      error: () => this.processandoId.set(null),
    });
  }

  /** Story 2.4 (RF26). */
  protected sair(comunidade: Comunidade): void {
    if (this.processandoId() !== null) {
      return;
    }

    this.processandoId.set(comunidade.id);
    this.comunidadesService.sair(comunidade.id).subscribe({
      next: () => this.processandoId.set(null),
      error: () => this.processandoId.set(null),
    });
  }
}
