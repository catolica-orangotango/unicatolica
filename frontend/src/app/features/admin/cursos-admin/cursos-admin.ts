import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService, UcButton } from '../../../ui';
import { CursoAdmin, CursoService, LIMITE_NOME_CURSO } from '../../identidade/curso.service';

const ERRO_GENERICO = 'Não foi possível concluir agora. Tente novamente em instantes.';

// Só espaços conta como vazio, igual ao backend.
const VALIDADORES_NOME = [Validators.required, Validators.pattern(/\S/), Validators.maxLength(LIMITE_NOME_CURSO)];

const avisoCadastrado = (curso: CursoAdmin) => `Curso ${curso.nome} cadastrado`;
const avisoRenomeado = (curso: CursoAdmin) => `Curso renomeado para ${curso.nome}`;
const avisoSituacao = (curso: CursoAdmin) => `Curso ${curso.nome} ${curso.ativo ? 'reativado' : 'desativado'}`;

/** Tela "Cursos" de /admin (KAN-44): cadastrar, renomear, desativar e reativar cursos. */
@Component({
  selector: 'app-cursos-admin',
  imports: [ReactiveFormsModule, UcButton],
  templateUrl: './cursos-admin.html',
  styleUrl: './cursos-admin.scss',
})
export class CursosAdmin implements OnInit {
  private readonly cursoService = inject(CursoService);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  private readonly campoEdicao = viewChild<ElementRef<HTMLInputElement>>('campoEdicao');
  private readonly botaoConfirmarDesativar = viewChild<ElementRef<HTMLButtonElement>>('botaoConfirmarDesativar');

  protected readonly limiteNome = LIMITE_NOME_CURSO;
  protected readonly cursos = signal<CursoAdmin[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erroLista = signal<string | null>(null);
  protected readonly cadastrando = signal(false);
  protected readonly erroCadastro = signal<string | null>(null);
  protected readonly editando = signal<CursoAdmin | null>(null);
  protected readonly salvandoEdicao = signal(false);
  protected readonly erroEdicao = signal<string | null>(null);
  protected readonly desativando = signal<CursoAdmin | null>(null);
  protected readonly processandoSituacao = signal(false);
  protected readonly erroSituacao = signal<string | null>(null);

  protected readonly formNovo = this.formBuilder.nonNullable.group({ nome: ['', VALIDADORES_NOME] });
  protected readonly formEdicao = this.formBuilder.nonNullable.group({ nome: ['', VALIDADORES_NOME] });

  ngOnInit(): void {
    this.cursoService.listarAdmin().subscribe({
      next: (cursos) => {
        this.cursos.set(cursos);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.erroLista.set('Não foi possível carregar os cursos agora.');
      },
    });
  }

  protected cadastrar(): void {
    if (this.formNovo.invalid) {
      this.formNovo.markAllAsTouched();
      return;
    }

    this.cadastrando.set(true);
    this.erroCadastro.set(null);
    this.cursoService.cadastrar(this.formNovo.getRawValue().nome.trim()).subscribe({
      next: (curso) => {
        this.cadastrando.set(false);
        this.cursos.update((lista) => this.ordenar([...lista, curso]));
        this.formNovo.reset({ nome: '' });
        this.toastService.mostrar(avisoCadastrado(curso));
      },
      error: (erro: HttpErrorResponse) => {
        this.cadastrando.set(false);
        this.erroCadastro.set(this.mensagemDaApi(erro));
      },
    });
  }

  protected pedirEdicao(curso: CursoAdmin): void {
    this.desativando.set(null);
    this.erroEdicao.set(null);
    this.formEdicao.reset({ nome: curso.nome });
    this.editando.set(curso);
    setTimeout(() => this.campoEdicao()?.nativeElement.focus());
  }

  protected cancelarEdicao(): void {
    this.editando.set(null);
  }

  protected salvarEdicao(): void {
    const curso = this.editando();
    if (!curso || this.salvandoEdicao()) {
      return;
    }
    if (this.formEdicao.invalid) {
      this.formEdicao.markAllAsTouched();
      return;
    }

    this.salvandoEdicao.set(true);
    this.erroEdicao.set(null);
    const nome = this.formEdicao.getRawValue().nome.trim();
    this.cursoService.atualizar(curso.id, { nome, ativo: curso.ativo }).subscribe({
      next: (atualizado) => {
        this.salvandoEdicao.set(false);
        this.editando.set(null);
        this.substituir(atualizado);
        this.toastService.mostrar(avisoRenomeado(atualizado));
      },
      error: (erro: HttpErrorResponse) => {
        this.salvandoEdicao.set(false);
        this.erroEdicao.set(this.mensagemDaApi(erro));
      },
    });
  }

  protected pedirDesativacao(curso: CursoAdmin): void {
    this.editando.set(null);
    this.erroSituacao.set(null);
    this.desativando.set(curso);
    setTimeout(() => this.botaoConfirmarDesativar()?.nativeElement.focus());
  }

  protected cancelarDesativacao(): void {
    this.desativando.set(null);
  }

  protected confirmarDesativacao(): void {
    const curso = this.desativando();
    if (curso) {
      this.mudarSituacao(curso, false);
    }
  }

  protected reativar(curso: CursoAdmin): void {
    this.mudarSituacao(curso, true);
  }

  private mudarSituacao(curso: CursoAdmin, ativo: boolean): void {
    if (this.processandoSituacao()) {
      return;
    }

    this.processandoSituacao.set(true);
    this.erroSituacao.set(null);
    this.cursoService.atualizar(curso.id, { nome: curso.nome, ativo }).subscribe({
      next: (atualizado) => {
        this.processandoSituacao.set(false);
        this.desativando.set(null);
        this.substituir(atualizado);
        this.toastService.mostrar(avisoSituacao(atualizado));
      },
      error: (erro: HttpErrorResponse) => {
        this.processandoSituacao.set(false);
        this.desativando.set(null);
        this.erroSituacao.set(this.mensagemDaApi(erro));
      },
    });
  }

  private substituir(atualizado: CursoAdmin): void {
    this.cursos.update((lista) => this.ordenar(lista.map((c) => (c.id === atualizado.id ? atualizado : c))));
  }

  private ordenar(lista: CursoAdmin[]): CursoAdmin[] {
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  private mensagemDaApi(erro: HttpErrorResponse): string {
    const mensagem: unknown = erro.error?.error?.message;
    return erro.status >= 400 && erro.status < 500 && typeof mensagem === 'string' ? mensagem : ERRO_GENERICO;
  }
}
