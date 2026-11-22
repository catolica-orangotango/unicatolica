import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, switchMap } from 'rxjs';
import { ToastService, UcButton } from '../../../ui';
import { ComunidadesService } from '../../comunidades/comunidades.service';
import { Curso, CursoService } from '../../identidade/curso.service';
import { MidiaService, mensagemDoServidor, validarArquivo } from '../../midia/midia.service';
import { NotificacoesService } from '../../notificacoes/notificacoes.service';
import { PerfilCartao } from '../perfil-cartao/perfil-cartao';
import { LIMITES_PERFIL, Perfil, PerfilService } from '../perfil.service';


function mensagemDeErroDaFoto(erro: HttpErrorResponse, acao: 'atualizar' | 'remover'): string {
  return mensagemDoServidor(erro, `Não foi possível ${acao} sua foto agora. Tente novamente em instantes.`);
}

/**
 * Próprio perfil acadêmico — rota `/perfil`, aberta pelo menu da conta. Mostra o perfil
 * (Story 4.2) e o formulário de criar/editar (Story 4.1): nome, curso, período e
 * interesses. Sem perfil acadêmico ainda (`periodo` nulo), já abre no formulário.
 */
@Component({
  selector: 'app-meu-perfil',
  imports: [ReactiveFormsModule, PerfilCartao, UcButton],
  templateUrl: './meu-perfil.html',
  styleUrl: './meu-perfil.scss',
})
export class MeuPerfil {
  private readonly perfilService = inject(PerfilService);
  private readonly cursoService = inject(CursoService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly notificacoesService = inject(NotificacoesService);
  private readonly midiaService = inject(MidiaService);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly limites = LIMITES_PERFIL;
  protected readonly periodos = Array.from({ length: LIMITES_PERFIL.periodoMaximo }, (_, i) => i + 1);

  protected readonly carregando = signal(true);
  protected readonly erroCarregar = signal<string | null>(null);
  protected readonly perfil = signal<Perfil | null>(null);
  protected readonly cursos = signal<Curso[]>([]);
  protected readonly editando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erroSalvar = signal<string | null>(null);

  protected readonly erroFoto = signal<string | null>(null);
  protected readonly enviandoFoto = signal(false);
  protected readonly removendoFoto = signal(false);
  private readonly botaoAlterarFoto = viewChild<ElementRef<HTMLButtonElement>>('botaoAlterarFoto');

  protected readonly interesses = signal<string[]>([]);
  protected readonly avisoInteresse = signal<string | null>(null);
  protected readonly limiteAtingido = computed(() => this.interesses().length >= LIMITES_PERFIL.interesses);

  /** Perfil ainda não criado: a tela abre no formulário e não oferece "Cancelar". */
  protected readonly primeiraVez = computed(() => this.perfil()?.periodo == null);

  /**
   * Opções do select: os cursos ativos e, se o curso atual foi desativado, ele também —
   * quem já está num curso desativado continua podendo salvar sem trocar.
   */
  protected readonly opcoesCurso = computed(() => {
    const atual = this.perfil()?.curso;
    const ativos = this.cursos();
    return atual && !ativos.some((c) => c.id === atual.id) ? [...ativos, atual] : ativos;
  });

  protected readonly form = this.formBuilder.group({
    nome: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(LIMITES_PERFIL.nome)]),
    cursoId: this.formBuilder.control<number | null>(null, [Validators.required]),
    periodo: this.formBuilder.control<number | null>(null, [Validators.required]),
    novoInteresse: this.formBuilder.nonNullable.control(''),
  });

  constructor() {
    forkJoin({ perfil: this.perfilService.meu(), cursos: this.cursoService.listar() }).subscribe({
      next: ({ perfil, cursos }) => {
        this.cursos.set(cursos);
        this.perfil.set(perfil);
        this.carregando.set(false);
        if (perfil.periodo == null) {
          this.abrirEdicao();
        }
      },
      error: () => {
        this.carregando.set(false);
        this.erroCarregar.set('Não foi possível carregar seu perfil agora. Tente novamente em instantes.');
      },
    });
  }

  /** Foto de perfil (KAN-128): só PNG/JPEG até 2 MB; envia com `FOTO_PERFIL` e depois define a foto. */
  protected escolherFoto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = ''; // permite escolher o mesmo arquivo de novo
    if (!arquivo) {
      return;
    }
    const erro = validarArquivo(arquivo, 'FOTO_PERFIL');
    this.erroFoto.set(erro);
    if (erro !== null) {
      return;
    }
    this.enviandoFoto.set(true);
    this.midiaService
      .enviar(arquivo, 'FOTO_PERFIL')
      .pipe(switchMap((enviado) => this.perfilService.definirFoto(enviado.id)))
      .subscribe({
        next: (perfil) => {
          this.perfil.set(perfil);
          this.enviandoFoto.set(false);
          this.toastService.mostrar('Foto atualizada');
        },
        error: (erro: HttpErrorResponse) => {
          this.enviandoFoto.set(false);
          this.erroFoto.set(mensagemDeErroDaFoto(erro, 'atualizar'));
        },
      });
  }

  protected removerFoto(): void {
    this.removendoFoto.set(true);
    this.erroFoto.set(null);
    this.perfilService.removerFoto().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.removendoFoto.set(false);
        this.toastService.mostrar('Foto removida');
        // "Remover foto" some: o foco não pode ficar no <body>.
        this.botaoAlterarFoto()?.nativeElement.focus();
      },
      error: (erro: HttpErrorResponse) => {
        this.removendoFoto.set(false);
        this.erroFoto.set(mensagemDeErroDaFoto(erro, 'remover'));
      },
    });
  }

  protected abrirEdicao(): void {
    const perfil = this.perfil();
    if (!perfil) {
      return;
    }
    this.form.reset({
      nome: perfil.nome,
      cursoId: perfil.curso?.id ?? null,
      periodo: perfil.periodo,
      novoInteresse: '',
    });
    this.interesses.set([...perfil.interesses]);
    this.avisoInteresse.set(null);
    this.erroSalvar.set(null);
    this.editando.set(true);
  }

  protected cancelar(): void {
    this.editando.set(false);
  }

  /** Mesma normalização do backend: sem espaços extras; repetido (ignorando maiúsculas) não entra. */
  protected adicionarInteresse(evento?: Event): void {
    evento?.preventDefault();
    const texto = this.form.controls.novoInteresse.value.trim().replace(/\s+/g, ' ');
    if (!texto) {
      return;
    }
    if (this.interesses().some((i) => i.toLowerCase() === texto.toLowerCase())) {
      this.avisoInteresse.set(`"${texto}" já está na lista.`);
      return;
    }
    if (this.limiteAtingido()) {
      this.avisoInteresse.set(`Você pode ter até ${LIMITES_PERFIL.interesses} interesses.`);
      return;
    }
    this.interesses.update((atuais) => [...atuais, texto]);
    this.form.controls.novoInteresse.setValue('');
    this.avisoInteresse.set(null);
  }

  protected removerInteresse(interesse: string): void {
    this.interesses.update((atuais) => atuais.filter((i) => i !== interesse));
    this.avisoInteresse.set(null);
  }

  protected salvar(): void {
    const { nome, cursoId, periodo } = this.form.getRawValue();
    if (this.form.invalid || cursoId == null || periodo == null) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erroSalvar.set(null);
    this.perfilService.salvar({ nome, cursoId, periodo, interesses: this.interesses() }).subscribe({
      next: (perfil) => {
        const trocouCurso = perfil.curso?.id !== this.perfil()?.curso?.id;
        this.perfil.set(perfil);
        this.salvando.set(false);
        this.editando.set(false);
        this.toastService.mostrar('Perfil salvo');
        if (trocouCurso) {
          // Trocar de curso troca a comunidade de curso (auto-join): atualiza a sidebar.
          this.comunidadesService.carregarMinhas().subscribe({ error: () => {} });
        }
        // Completar o perfil marca a notificação "complete seu perfil" como lida no
        // backend (Story 4.3) - sem isso o badge da sidebar fica preso no cache antigo
        // até o painel reabrir ou a página recarregar.
        this.notificacoesService.carregar().subscribe({ error: () => {} });
      },
      error: (erro: HttpErrorResponse) => {
        this.salvando.set(false);
        const mensagem: unknown = erro.error?.error?.message;
        this.erroSalvar.set(
          erro.status === 422 && typeof mensagem === 'string'
            ? mensagem
            : 'Não foi possível salvar seu perfil agora. Tente novamente em instantes.',
        );
      },
    });
  }
}
