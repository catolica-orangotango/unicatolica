import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ToastService } from '../../../ui';
import { tempoRelativo } from '../../publicacoes/tempo-relativo';
import { AnaliseDenuncia } from '../analise-denuncia/analise-denuncia';
import { Denuncia, ModeracaoService, SituacaoDenuncia } from '../moderacao.service';

const TAMANHO_PAGINA = 20;

/** Abas do filtro, na ordem em que aparecem. */
const FILTROS: readonly { situacao: SituacaoDenuncia; rotulo: string }[] = [
  { situacao: 'PENDENTE', rotulo: 'Pendentes' },
  { situacao: 'RESOLVIDA', rotulo: 'Resolvidas' },
  { situacao: 'DESCARTADA', rotulo: 'Descartadas' },
];

/**
 * Fila de denúncias do moderador (Story 12.4, RF77): lista + painel de análise
 * ({@link AnaliseDenuncia}), não modal (EXPERIENCE.md, Interaction Primitives). Chama as
 * ações da Story 12.5 (ocultar/restaurar) e do descarte e atualiza a fila. Nenhum dado do
 * denunciante chega até aqui (RF77.1). Remover, restringir e escalonar ainda não têm
 * endpoint e não aparecem.
 */
@Component({
  selector: 'app-fila-denuncias',
  imports: [AnaliseDenuncia],
  templateUrl: './fila-denuncias.html',
  styleUrl: './fila-denuncias.scss',
})
export class FilaDenuncias {
  private readonly moderacaoService = inject(ModeracaoService);
  private readonly toastService = inject(ToastService);

  protected readonly filtros = FILTROS;
  protected readonly situacao = signal<SituacaoDenuncia>('PENDENTE');
  protected readonly denuncias = signal<Denuncia[]>([]);
  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  protected readonly erroFila = signal<string | null>(null);
  protected readonly temMais = signal(false);
  private paginaAtual = 0;

  protected readonly selecionadaId = signal<number | null>(null);
  protected readonly selecionada = computed(
    () => this.denuncias().find((d) => d.id === this.selecionadaId()) ?? null,
  );

  protected readonly enviando = signal(false);
  protected readonly erroAcao = signal<string | null>(null);

  protected readonly tempoRelativo = tempoRelativo;

  constructor() {
    this.carregar();
  }

  protected filtrar(situacao: SituacaoDenuncia): void {
    if (situacao === this.situacao()) {
      return;
    }
    this.situacao.set(situacao);
    this.carregar();
  }

  protected selecionar(denuncia: Denuncia): void {
    this.selecionadaId.set(denuncia.id);
    this.erroAcao.set(null);
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erroFila.set(null);
    this.moderacaoService.listar(this.situacao(), 0, TAMANHO_PAGINA).subscribe({
      next: (pagina) => {
        this.paginaAtual = 0;
        this.denuncias.set(pagina.content);
        this.temMais.set(pagina.totalPages > 1);
        this.carregando.set(false);
        const primeira = pagina.content[0];
        if (primeira) {
          this.selecionar(primeira);
        } else {
          this.selecionadaId.set(null);
        }
      },
      error: () => {
        this.carregando.set(false);
        this.erroFila.set('Não conseguimos carregar as denúncias agora. Tente novamente em instantes.');
      },
    });
  }

  protected carregarMais(): void {
    if (this.carregandoMais()) {
      return;
    }
    const proxima = this.paginaAtual + 1;
    this.carregandoMais.set(true);
    this.moderacaoService.listar(this.situacao(), proxima, TAMANHO_PAGINA).subscribe({
      next: (pagina) => {
        this.paginaAtual = proxima;
        const vistas = new Set(this.denuncias().map((d) => d.id));
        this.denuncias.update((atuais) => [...atuais, ...pagina.content.filter((d) => !vistas.has(d.id))]);
        this.temMais.set(proxima + 1 < pagina.totalPages);
        this.carregandoMais.set(false);
      },
      error: () => {
        this.carregandoMais.set(false);
        this.toastService.mostrar('Não foi possível carregar mais denúncias.');
      },
    });
  }

  /** RF78 — também resolve as outras denúncias pendentes da mesma postagem, que saem da fila. */
  protected ocultar(denuncia: Denuncia, motivo: string): void {
    this.executar(this.moderacaoService.ocultar(denuncia.id, motivo), 'Postagem ocultada', (d) =>
      this.situacao() === 'PENDENTE' ? (outra) => outra.conteudo.id !== d.conteudo.id : null,
    );
  }

  protected descartar(denuncia: Denuncia, motivo: string | undefined): void {
    this.executar(this.moderacaoService.descartar(denuncia.id, motivo), 'Denúncia descartada', (d) =>
      this.situacao() === 'PENDENTE' ? (outra) => outra.id !== d.id : null,
    );
  }

  /** RF78.1 — qualquer moderador; a denúncia continua resolvida, a postagem volta ao feed. */
  protected restaurar(denuncia: Denuncia): void {
    this.executar(this.moderacaoService.restaurar(denuncia.id), 'Postagem restaurada', () => null);
  }

  /**
   * Roda a ação e atualiza a fila. `manter` devolve o filtro de quem continua na lista
   * atual (ex.: pendentes saem depois de ocultar) ou `null` para só atualizar o item.
   */
  private executar(
    acao: Observable<Denuncia>,
    mensagem: string,
    manter: (atualizada: Denuncia) => ((outra: Denuncia) => boolean) | null,
  ): void {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.erroAcao.set(null);
    acao.subscribe({
      next: (atualizada) => {
        this.enviando.set(false);
        this.toastService.mostrar(mensagem);
        const filtro = manter(atualizada);
        if (filtro) {
          const restantes = this.denuncias().filter(filtro);
          this.denuncias.set(restantes);
          if (restantes[0]) {
            this.selecionar(restantes[0]);
          } else {
            this.selecionadaId.set(null);
          }
        } else {
          this.denuncias.update((atuais) => atuais.map((d) => (d.id === atualizada.id ? atualizada : d)));
        }
        this.moderacaoService.atualizarPendentes();
      },
      error: (erro: HttpErrorResponse) => {
        this.enviando.set(false);
        this.erroAcao.set(this.mensagemDeErro(erro));
      },
    });
  }

  private mensagemDeErro(erro: HttpErrorResponse): string {
    const mensagemApi: unknown = erro.error?.error?.message;
    if ([403, 404, 409, 422].includes(erro.status) && typeof mensagemApi === 'string') {
      return mensagemApi;
    }
    return 'Não foi possível concluir a ação agora. Tente novamente em instantes.';
  }
}
