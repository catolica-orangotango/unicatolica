import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UcButton } from '../../../ui';
import { iniciais, tempoRelativo } from '../../publicacoes/tempo-relativo';
import { Denuncia, TAMANHO_MAXIMO_MOTIVO } from '../moderacao.service';

/**
 * Painel de análise de uma denúncia (Story 12.4) — conteúdo, autor e motivo, nunca quem
 * denunciou (RF77.1). Ações conforme o estado: pendente → ocultar (motivo obrigatório,
 * é o que o autor recebe, RF78.2) ou descartar; postagem oculta → restaurar (RF78.1).
 * Quem chama o backend é a {@link FilaDenuncias}; aqui só emite a decisão.
 */
@Component({
  selector: 'app-analise-denuncia',
  imports: [FormsModule, RouterLink, UcButton],
  templateUrl: './analise-denuncia.html',
  styleUrl: './analise-denuncia.scss',
})
export class AnaliseDenuncia {
  readonly denuncia = input.required<Denuncia>();
  readonly enviando = input(false);
  readonly erro = input<string | null>(null);

  readonly ocultar = output<string>();
  readonly descartar = output<string | undefined>();
  readonly restaurar = output<void>();

  protected readonly limite = TAMANHO_MAXIMO_MOTIVO;
  protected readonly motivo = signal('');
  private readonly motivoValido = computed(() => this.motivo().trim().length <= this.limite);
  protected readonly podeOcultar = computed(
    () => !this.enviando() && this.motivo().trim().length > 0 && this.motivoValido(),
  );
  protected readonly podeDescartar = computed(() => !this.enviando() && this.motivoValido());

  protected readonly iniciais = iniciais;
  protected readonly tempoRelativo = tempoRelativo;

  constructor() {
    // Outra denúncia selecionada (ou a mesma atualizada): o rascunho de motivo não vale mais.
    effect(() => {
      this.denuncia();
      this.motivo.set('');
    });
  }

  protected confirmarOcultacao(): void {
    if (this.podeOcultar()) {
      this.ocultar.emit(this.motivo().trim());
    }
  }

  protected confirmarDescarte(): void {
    if (this.podeDescartar()) {
      this.descartar.emit(this.motivo().trim() || undefined);
    }
  }
}
