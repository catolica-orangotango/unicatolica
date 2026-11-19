import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService, UcButton } from '../../../ui';
import { Comunidade, ComunidadesService } from '../../comunidades/comunidades.service';
import {
  EnquetesService,
  LIMITE_OPCAO,
  LIMITE_PERGUNTA,
  MAXIMO_ATIVAS_POR_COMUNIDADE,
  MAXIMO_OPCOES,
  MINIMO_OPCOES,
  TipoEnquete,
} from '../enquetes.service';

/** Criar enquete numa comunidade da qual o usuário é membro (Story 8.1) — rota `/enquetes/nova`. */
@Component({
  selector: 'app-criar-enquete',
  imports: [ReactiveFormsModule, RouterLink, UcButton],
  templateUrl: './criar-enquete.html',
  styleUrl: './criar-enquete.scss',
})
export class CriarEnquete implements OnInit {
  private readonly enquetesService = inject(EnquetesService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly limitePergunta = LIMITE_PERGUNTA;
  protected readonly limiteOpcao = LIMITE_OPCAO;
  protected readonly minimoOpcoes = MINIMO_OPCOES;
  protected readonly maximoOpcoes = MAXIMO_OPCOES;
  protected readonly maximoAtivas = MAXIMO_ATIVAS_POR_COMUNIDADE;

  protected readonly carregando = signal(true);
  protected readonly erroCarregar = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erroSalvar = signal<string | null>(null);
  protected readonly tentouEnviar = signal(false);

  protected readonly comunidades = signal<Comunidade[]>([]);
  /** Quantas enquetes ativas o usuário tem em cada comunidade (RF53.3). */
  private readonly ativasPorComunidade = signal<Map<number, number>>(new Map());
  protected readonly tipoEscolhido = signal<TipoEnquete>('UNICA');
  protected readonly totalOpcoes = signal(MINIMO_OPCOES);

  /** Só espaços conta como vazio, igual ao backend. */
  private static textoPreenchido(limite: number) {
    return [Validators.required, Validators.pattern(/\S/), Validators.maxLength(limite)];
  }

  protected readonly form = this.formBuilder.group({
    comunidadeId: this.formBuilder.control<number | null>(null, Validators.required),
    pergunta: this.formBuilder.nonNullable.control('', CriarEnquete.textoPreenchido(LIMITE_PERGUNTA)),
    tipo: this.formBuilder.nonNullable.control<TipoEnquete>('UNICA'),
    limiteSelecao: this.formBuilder.control<number | null>(null),
    opcoes: this.formBuilder.array([this.novaOpcao(), this.novaOpcao()]),
  });

  /** Valores possíveis do limite de seleção: de 2 até o número de opções (RF54.2). */
  protected readonly limitesPossiveis = computed(() => {
    const total = this.totalOpcoes();
    return total < 2 ? [] : Array.from({ length: total - 1 }, (_, i) => i + 2);
  });

  protected get opcoes(): FormArray {
    return this.form.controls.opcoes;
  }

  ngOnInit(): void {
    this.comunidadesService.carregarMinhas().subscribe({
      next: (minhas) => {
        this.comunidades.set(minhas);
        this.carregarAtivas();
      },
      error: () => this.falharAoCarregar(),
    });
  }

  private carregarAtivas(): void {
    this.enquetesService.minhasAtivas().subscribe({
      next: (pagina) => {
        const contagem = new Map<number, number>();
        for (const enquete of pagina.content) {
          contagem.set(enquete.comunidadeId, (contagem.get(enquete.comunidadeId) ?? 0) + 1);
        }
        this.ativasPorComunidade.set(contagem);
        this.carregando.set(false);
      },
      error: () => this.falharAoCarregar(),
    });
  }

  private falharAoCarregar(): void {
    this.carregando.set(false);
    this.erroCarregar.set('Não foi possível carregar suas comunidades agora. Tente novamente em instantes.');
  }

  /** Comunidade em que o usuário já tem duas enquetes ativas aparece desabilitada (RF53.3). */
  protected noLimite(comunidade: Comunidade): boolean {
    return (this.ativasPorComunidade().get(comunidade.id) ?? 0) >= MAXIMO_ATIVAS_POR_COMUNIDADE;
  }

  protected escolherTipo(tipo: TipoEnquete): void {
    this.tipoEscolhido.set(tipo);
    this.form.controls.tipo.setValue(tipo);
    const limite = this.form.controls.limiteSelecao;
    if (tipo === 'MULTIPLA') {
      limite.setValidators(Validators.required);
    } else {
      limite.clearValidators();
      limite.setValue(null);
    }
    limite.updateValueAndValidity();
  }

  protected adicionarOpcao(): void {
    if (this.opcoes.length >= MAXIMO_OPCOES) {
      return;
    }
    this.opcoes.push(this.novaOpcao());
    this.totalOpcoes.set(this.opcoes.length);
  }

  protected removerOpcao(indice: number): void {
    if (this.opcoes.length <= MINIMO_OPCOES) {
      return;
    }
    this.opcoes.removeAt(indice);
    this.totalOpcoes.set(this.opcoes.length);
    // O limite não pode passar do número de opções que sobrou.
    const limite = this.form.controls.limiteSelecao;
    if (limite.value !== null && limite.value > this.opcoes.length) {
      limite.setValue(null);
    }
  }

  protected opcaoInvalida(indice: number): boolean {
    const controle = this.opcoes.at(indice);
    return (this.tentouEnviar() || controle.touched) && controle.invalid;
  }

  protected campoInvalido(nome: 'comunidadeId' | 'pergunta' | 'limiteSelecao'): boolean {
    const controle = this.form.controls[nome];
    return (this.tentouEnviar() || controle.touched) && controle.invalid;
  }

  protected criar(): void {
    this.tentouEnviar.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { comunidadeId, pergunta, tipo, limiteSelecao } = this.form.getRawValue();
    const opcoes = (this.opcoes.getRawValue() as string[]).map((texto) => texto.trim());
    this.salvando.set(true);
    this.erroSalvar.set(null);
    this.enquetesService
      .criar(Number(comunidadeId), {
        pergunta: pergunta.trim(),
        tipo,
        limiteSelecao: tipo === 'MULTIPLA' && limiteSelecao !== null ? Number(limiteSelecao) : null,
        opcoes,
      })
      .subscribe({
        next: (enquete) => {
          this.toastService.mostrar('Enquete criada');
          this.router.navigate(['/comunidades', enquete.comunidadeId]);
        },
        error: (erro: HttpErrorResponse) => {
          this.salvando.set(false);
          const mensagem: unknown = erro.error?.error?.message;
          const conhecido = [403, 404, 409, 422].includes(erro.status) && typeof mensagem === 'string';
          this.erroSalvar.set(
            conhecido ? mensagem : 'Não foi possível criar a enquete agora. Tente novamente em instantes.',
          );
        },
      });
  }

  private novaOpcao() {
    return this.formBuilder.nonNullable.control('', CriarEnquete.textoPreenchido(LIMITE_OPCAO));
  }
}
