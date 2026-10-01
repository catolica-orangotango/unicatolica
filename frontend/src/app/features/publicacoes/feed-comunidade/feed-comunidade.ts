import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService, UcBadge, UcButton, UcCard } from '../../../ui';
import { ModeracaoService, TAMANHO_MAXIMO_MOTIVO } from '../../moderacao/moderacao.service';
import { Publicacao, PublicacoesService, TAMANHO_MAXIMO_CONTEUDO } from '../publicacoes.service';
import { iniciais, tempoRelativo } from '../tempo-relativo';

const TAMANHO_PAGINA = 20;

/**
 * Feed de uma comunidade (Story 3.2, RF36) e caixa de postar (Story 3.1, RF32–RF35).
 * Vive dentro da "Home da comunidade" (`ComunidadeDetalhe`), que já sabe se o usuário é
 * membro: não-membro lê o feed, mas vê o aviso no lugar da caixa (RF27.1, Story 2.5).
 * Cada postagem de outra pessoa pode ser denunciada (Story 12.1) — o formulário abre
 * dentro do próprio card, sem modal.
 */
@Component({
  selector: 'app-feed-comunidade',
  imports: [FormsModule, RouterLink, UcBadge, UcButton, UcCard],
  templateUrl: './feed-comunidade.html',
  styleUrl: './feed-comunidade.scss',
})
export class FeedComunidade {
  private readonly publicacoesService = inject(PublicacoesService);
  private readonly toastService = inject(ToastService);
  private readonly moderacaoService = inject(ModeracaoService);
  private readonly authService = inject(AuthService);

  readonly comunidadeId = input.required<number>();
  readonly comunidadeNome = input.required<string>();
  readonly tipo = input.required<'CURSO' | 'ABERTA'>();
  readonly souMembro = input.required<boolean>();

  protected readonly limite = TAMANHO_MAXIMO_CONTEUDO;
  protected readonly publicacoes = signal<Publicacao[]>([]);
  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  protected readonly erroFeed = signal<string | null>(null);
  protected readonly temMais = signal(false);
  private paginaAtual = 0;

  protected readonly conteudo = signal('');
  protected readonly publicando = signal(false);
  protected readonly erroPublicar = signal<string | null>(null);
  protected readonly restantes = computed(() => this.limite - this.conteudo().trim().length);
  protected readonly podePublicar = computed(
    () => !this.publicando() && this.conteudo().trim().length > 0 && this.restantes() >= 0,
  );

  /** Quem está logado — a própria postagem não mostra "Denunciar" (o backend daria 403). */
  protected readonly usuarioId = this.authService.usuarioId();
  protected readonly limiteMotivo = TAMANHO_MAXIMO_MOTIVO;
  protected readonly denunciandoId = signal<number | null>(null);
  protected readonly motivoDenuncia = signal('');
  protected readonly enviandoDenuncia = signal(false);
  protected readonly erroDenuncia = signal<string | null>(null);
  /** Postagens já denunciadas nesta sessão: o botão vira "Denunciada". */
  protected readonly denunciadas = signal<ReadonlySet<number>>(new Set());
  protected readonly podeDenunciar = computed(() => {
    const texto = this.motivoDenuncia().trim();
    return !this.enviandoDenuncia() && texto.length > 0 && texto.length <= this.limiteMotivo;
  });

  protected readonly iniciais = iniciais;
  protected readonly tempoRelativo = tempoRelativo;

  constructor() {
    // Recarrega só quando a comunidade muda — entrar/sair (souMembro) não refaz o feed.
    effect(() => {
      const id = this.comunidadeId();
      untracked(() => this.carregar(id));
    });
  }

  private carregar(id: number): void {
    this.carregando.set(true);
    this.erroFeed.set(null);
    this.publicacoesService.listar(id, 0, TAMANHO_PAGINA).subscribe({
      next: (pagina) => {
        this.paginaAtual = 0;
        this.publicacoes.set(pagina.content);
        this.temMais.set(pagina.totalPages > 1);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.erroFeed.set('Não foi possível carregar as postagens agora. Tente novamente em instantes.');
      },
    });
  }

  protected carregarMais(): void {
    if (this.carregandoMais()) {
      return;
    }
    const proxima = this.paginaAtual + 1;
    this.carregandoMais.set(true);
    this.publicacoesService.listar(this.comunidadeId(), proxima, TAMANHO_PAGINA).subscribe({
      next: (pagina) => {
        this.paginaAtual = proxima;
        // Postagem publicada nesta sessão já está no topo; não repetir se cair nesta página.
        const vistos = new Set(this.publicacoes().map((p) => p.id));
        this.publicacoes.update((atuais) => [...atuais, ...pagina.content.filter((p) => !vistos.has(p.id))]);
        this.temMais.set(proxima + 1 < pagina.totalPages);
        this.carregandoMais.set(false);
      },
      error: () => {
        this.carregandoMais.set(false);
        this.toastService.mostrar('Não foi possível carregar mais postagens.');
      },
    });
  }

  protected publicar(): void {
    if (!this.podePublicar()) {
      return;
    }
    this.publicando.set(true);
    this.erroPublicar.set(null);
    this.publicacoesService.criar(this.comunidadeId(), this.conteudo()).subscribe({
      next: (publicacao) => {
        this.publicando.set(false);
        this.conteudo.set('');
        this.publicacoes.update((atuais) => [publicacao, ...atuais]);
        this.toastService.mostrar('Postagem publicada');
      },
      error: (erro: HttpErrorResponse) => {
        this.publicando.set(false);
        this.erroPublicar.set(this.mensagemDeErro(erro));
      },
    });
  }

  protected abrirDenuncia(publicacaoId: number): void {
    this.denunciandoId.set(publicacaoId);
    this.motivoDenuncia.set('');
    this.erroDenuncia.set(null);
  }

  protected cancelarDenuncia(): void {
    this.denunciandoId.set(null);
  }

  /** Story 12.1 (RF75, RF76) — o denunciante nunca é mostrado ao moderador (RF77.1). */
  protected enviarDenuncia(): void {
    const publicacaoId = this.denunciandoId();
    if (publicacaoId === null || !this.podeDenunciar()) {
      return;
    }
    this.enviandoDenuncia.set(true);
    this.erroDenuncia.set(null);
    this.moderacaoService.denunciar(publicacaoId, this.motivoDenuncia().trim()).subscribe({
      next: () => {
        this.enviandoDenuncia.set(false);
        this.marcarDenunciada(publicacaoId);
        this.toastService.mostrar('Denúncia enviada. A moderação vai analisar.');
      },
      error: (erro: HttpErrorResponse) => {
        this.enviandoDenuncia.set(false);
        const mensagemApi: unknown = erro.error?.error?.message;
        if (erro.status === 409) {
          // Já denunciada por esta pessoa (DENUNCIA_DUPLICADA): nada a reenviar.
          this.marcarDenunciada(publicacaoId);
          this.toastService.mostrar(typeof mensagemApi === 'string' ? mensagemApi : 'Você já denunciou esta postagem.');
          return;
        }
        this.erroDenuncia.set(
          [403, 404, 422].includes(erro.status) && typeof mensagemApi === 'string'
            ? mensagemApi
            : 'Não foi possível enviar a denúncia agora. Tente novamente em instantes.',
        );
      },
    });
  }

  private marcarDenunciada(publicacaoId: number): void {
    this.denunciadas.update((atuais) => new Set([...atuais, publicacaoId]));
    this.denunciandoId.set(null);
  }

  private mensagemDeErro(erro: HttpErrorResponse): string {
    const mensagemApi: unknown = erro.error?.error?.message;
    if ((erro.status === 403 || erro.status === 422) && typeof mensagemApi === 'string') {
      return mensagemApi;
    }
    return 'Não foi possível publicar agora. Tente novamente em instantes.';
  }
}
