import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService, UcButton, UcIcon } from '../../../ui';
import { Curso, CursoService } from '../../identidade/curso.service';
import {
  Aviso,
  AvisosAdminService,
  LIMITE_MENSAGEM_AVISO,
  LIMITE_TITULO_AVISO,
} from './avisos-admin.service';

const ERRO_GENERICO = 'Não foi possível publicar agora. Tente novamente em instantes.';

/** Quantos avisos aparecem em "Enviados recentemente". */
const RECENTES = 5;

// Só espaços conta como vazio, igual ao backend.
const TEXTO_OBRIGATORIO = [Validators.required, Validators.pattern(/\S/)];

/**
 * Card "Publicar aviso" da Administração (Story 13.1, RF81): título, mensagem, para quem
 * (todos os cursos ou um curso) e data em destaque, mais os avisos enviados recentemente.
 */
@Component({
  selector: 'app-avisos-admin',
  imports: [ReactiveFormsModule, DatePipe, UcButton, UcIcon],
  templateUrl: './avisos-admin.html',
  styleUrl: './avisos-admin.scss',
})
export class AvisosAdmin implements OnInit {
  private readonly avisosService = inject(AvisosAdminService);
  private readonly cursoService = inject(CursoService);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly limiteTitulo = LIMITE_TITULO_AVISO;
  protected readonly limiteMensagem = LIMITE_MENSAGEM_AVISO;

  protected readonly cursos = signal<Curso[]>([]);
  protected readonly recentes = signal<Aviso[]>([]);
  protected readonly erroRecentes = signal<string | null>(null);
  protected readonly publicando = signal(false);
  protected readonly erro = signal<string | null>(null);

  /** `destino` vazio = "Todos os cursos" (escopo GERAL); senão o id do curso. */
  protected readonly form = this.formBuilder.nonNullable.group({
    titulo: ['', [...TEXTO_OBRIGATORIO, Validators.maxLength(LIMITE_TITULO_AVISO)]],
    mensagem: ['', [...TEXTO_OBRIGATORIO, Validators.maxLength(LIMITE_MENSAGEM_AVISO)]],
    destino: [''],
    dataDestaque: [''],
  });

  ngOnInit(): void {
    this.cursoService.listar().subscribe({ next: (cursos) => this.cursos.set(cursos), error: () => undefined });
    this.carregarRecentes();
  }

  protected publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.publicando()) {
      return;
    }
    const { titulo, mensagem, destino, dataDestaque } = this.form.getRawValue();
    this.publicando.set(true);
    this.erro.set(null);
    this.avisosService
      .publicar({
        titulo,
        mensagem,
        escopo: destino === '' ? 'GERAL' : 'CURSO',
        cursoId: destino === '' ? null : Number(destino),
        dataDestaque: dataDestaque === '' ? null : dataDestaque,
      })
      .subscribe({
        next: (aviso) => {
          this.publicando.set(false);
          this.form.reset({ titulo: '', mensagem: '', destino: '', dataDestaque: '' });
          this.recentes.update((atuais) => [aviso, ...atuais].slice(0, RECENTES));
          this.toastService.mostrar('Aviso publicado');
        },
        error: (resposta: HttpErrorResponse) => {
          this.publicando.set(false);
          const mensagemApi = resposta.error?.error?.message;
          this.erro.set(typeof mensagemApi === 'string' ? mensagemApi : ERRO_GENERICO);
        },
      });
  }

  /** "Todos os cursos · 22/10" — o escopo antes da data de publicação. */
  protected paraQuem(aviso: Aviso): string {
    return aviso.escopo === 'GERAL' ? 'Todos os cursos' : (aviso.cursoNome ?? 'Um curso');
  }

  protected carregarRecentes(): void {
    this.erroRecentes.set(null);
    this.avisosService.listar(0, RECENTES).subscribe({
      next: (pagina) => this.recentes.set(pagina.content),
      error: () => this.erroRecentes.set('Não foi possível carregar os avisos enviados.'),
    });
  }
}
