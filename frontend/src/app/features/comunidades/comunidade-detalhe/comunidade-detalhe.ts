import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Comunidade, ComunidadesService } from '../comunidades.service';
import { UcButton, UcMemberIndicator } from '../../../ui';
import { FeedComunidade } from '../../publicacoes/feed-comunidade/feed-comunidade';

/**
 * "Home" de uma comunidade — mesmo padrão de tela pra qualquer uma (curso ou
 * aberta), rota `/comunidades/:id`. Renderiza dentro do `Shell`, então já tem
 * navegação global. Abaixo do cabeçalho, o feed da comunidade e a caixa de postar
 * (`FeedComunidade`, Stories 3.1/3.2) — entrar ou sair atualiza `souMembro` e a caixa
 * aparece ou some sem recarregar o feed.
 */
@Component({
  selector: 'app-comunidade-detalhe',
  imports: [DatePipe, FeedComunidade, UcButton, UcMemberIndicator],
  templateUrl: './comunidade-detalhe.html',
  styleUrl: './comunidade-detalhe.scss',
})
export class ComunidadeDetalhe {
  private readonly route = inject(ActivatedRoute);
  private readonly comunidadesService = inject(ComunidadesService);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly comunidade = signal<Comunidade | null>(null);
  protected readonly processando = signal(false);

  constructor() {
    // Componente é recriado a cada navegação pra um :id diferente (rota simples,
    // sem reuse customizado) — o snapshot já basta, não precisa assinar paramMap.
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.carregar(id);
  }

  private carregar(id: number): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.comunidadesService.obter(id).subscribe({
      next: (comunidade) => {
        this.comunidade.set(comunidade);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Não foi possível carregar essa comunidade agora. Tente novamente em instantes.');
      },
    });
  }

  /** Story 2.4 (RF24/RF25) — só chega aqui pra comunidade ABERTA (o template esconde o botão pra CURSO). */
  protected ingressar(): void {
    const comunidade = this.comunidade();
    if (!comunidade || this.processando()) {
      return;
    }

    this.processando.set(true);
    this.comunidadesService.ingressar(comunidade.id, comunidade.nome).subscribe({
      next: () => {
        this.processando.set(false);
        this.comunidade.set({ ...comunidade, souMembro: true });
      },
      error: () => {
        this.processando.set(false);
        this.carregar(comunidade.id);
      },
    });
  }

  /** Story 2.4 (RF26). */
  protected sair(): void {
    const comunidade = this.comunidade();
    if (!comunidade || this.processando()) {
      return;
    }

    this.processando.set(true);
    this.comunidadesService.sair(comunidade.id).subscribe({
      next: () => {
        this.processando.set(false);
        this.comunidade.set({ ...comunidade, souMembro: false });
      },
      error: () => {
        this.processando.set(false);
        this.carregar(comunidade.id);
      },
    });
  }
}
