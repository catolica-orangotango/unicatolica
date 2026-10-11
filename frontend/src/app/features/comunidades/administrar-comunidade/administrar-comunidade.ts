import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, inject, input, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UcButton } from '../../../ui';
import { Comunidade, ComunidadesService, LIMITE_NOME_COMUNIDADE, MembroComunidade } from '../comunidades.service';

const ERRO_GENERICO = 'Não foi possível concluir agora. Tente novamente em instantes.';

/** Ações do administrador no detalhe da comunidade (Story 2.6): editar, remover membro e excluir. */
@Component({
  selector: 'app-administrar-comunidade',
  imports: [ReactiveFormsModule, UcButton],
  templateUrl: './administrar-comunidade.html',
  styleUrl: './administrar-comunidade.scss',
})
export class AdministrarComunidade implements OnInit {
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly formBuilder = inject(FormBuilder);

  readonly comunidade = input.required<Comunidade>();
  readonly atualizada = output<Comunidade>();
  readonly excluida = output<void>();

  private readonly botaoConfirmarRemocao = viewChild<ElementRef<HTMLButtonElement>>('botaoConfirmarRemocao');
  private readonly botaoConfirmarExclusao = viewChild<ElementRef<HTMLButtonElement>>('botaoConfirmarExclusao');

  protected readonly limiteNome = LIMITE_NOME_COMUNIDADE;
  protected readonly salvando = signal(false);
  protected readonly erroSalvar = signal<string | null>(null);
  protected readonly membros = signal<MembroComunidade[]>([]);
  protected readonly erroMembros = signal<string | null>(null);
  protected readonly removendo = signal<MembroComunidade | null>(null);
  protected readonly processandoRemocao = signal(false);
  protected readonly confirmandoExclusao = signal(false);
  protected readonly excluindo = signal(false);
  protected readonly erroExclusao = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    // Só espaços conta como vazio, igual ao backend (RF22).
    nome: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(LIMITE_NOME_COMUNIDADE)]],
    descricao: [''],
  });

  ngOnInit(): void {
    const { nome, descricao } = this.comunidade();
    this.form.setValue({ nome, descricao: descricao ?? '' });
    this.carregarMembros();
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, descricao } = this.form.getRawValue();
    this.salvando.set(true);
    this.erroSalvar.set(null);
    this.comunidadesService.editar(this.comunidade().id, { nome: nome.trim(), descricao: descricao.trim() }).subscribe({
      next: (comunidade) => {
        this.salvando.set(false);
        this.form.markAsPristine();
        this.atualizada.emit(comunidade);
      },
      error: (erro: HttpErrorResponse) => {
        this.salvando.set(false);
        this.erroSalvar.set(this.mensagemDaApi(erro));
      },
    });
  }

  protected pedirRemocao(membro: MembroComunidade): void {
    this.removendo.set(membro);
    setTimeout(() => this.botaoConfirmarRemocao()?.nativeElement.focus());
  }

  protected cancelarRemocao(): void {
    this.removendo.set(null);
  }

  protected confirmarRemocao(): void {
    const membro = this.removendo();
    if (!membro || this.processandoRemocao()) {
      return;
    }

    this.processandoRemocao.set(true);
    this.erroMembros.set(null);
    this.comunidadesService.removerMembro(this.comunidade().id, membro.usuarioId).subscribe({
      next: () => {
        this.processandoRemocao.set(false);
        this.removendo.set(null);
        this.membros.update((lista) => lista.filter((m) => m.usuarioId !== membro.usuarioId));
      },
      error: (erro: HttpErrorResponse) => {
        this.processandoRemocao.set(false);
        this.removendo.set(null);
        this.erroMembros.set(this.mensagemDaApi(erro));
      },
    });
  }

  protected pedirExclusao(): void {
    this.confirmandoExclusao.set(true);
    setTimeout(() => this.botaoConfirmarExclusao()?.nativeElement.focus());
  }

  protected cancelarExclusao(): void {
    this.confirmandoExclusao.set(false);
  }

  protected confirmarExclusao(): void {
    if (this.excluindo()) {
      return;
    }

    this.excluindo.set(true);
    this.erroExclusao.set(null);
    this.comunidadesService.excluir(this.comunidade().id).subscribe({
      next: () => this.excluida.emit(),
      error: (erro: HttpErrorResponse) => {
        this.excluindo.set(false);
        this.confirmandoExclusao.set(false);
        this.erroExclusao.set(this.mensagemDaApi(erro));
      },
    });
  }

  // Primeira página só: com o tamanho máximo do contrato, cobre as comunidades desta fase.
  private carregarMembros(): void {
    this.comunidadesService.listarMembros(this.comunidade().id, 0, 100).subscribe({
      next: (pagina) => this.membros.set(pagina.content),
      error: () => this.erroMembros.set('Não foi possível carregar os membros agora.'),
    });
  }

  private mensagemDaApi(erro: HttpErrorResponse): string {
    const mensagem: unknown = erro.error?.error?.message;
    return erro.status >= 400 && erro.status < 500 && typeof mensagem === 'string' ? mensagem : ERRO_GENERICO;
  }
}
