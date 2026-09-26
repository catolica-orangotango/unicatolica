import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Comunidade, ComunidadesService } from '../../../core/comunidades/comunidades.service';
import { UcButton } from '../../../ui';

/** Envelope de erro padrão da API (AD-5) — espelha `ErroResponse` do backend. */
interface ErroResponse {
  error: {
    code: string;
    message: string;
    details: string | null;
  };
}

/**
 * Story 2.1 (RF21.1, RF21.2, RF22) — administrador pré-cria a comunidade de um curso.
 * `POST /comunidades/curso` já recusa quem não é ADMINISTRADOR (403) e nome duplicado
 * (409); aqui só falta a validação de campo obrigatório no próprio formulário, antes de
 * ir à rede.
 *
 * Depois de criar, a tela continua na própria página em vez de navegar embora — o
 * formulário é limpo e o toast confirma, pra o administrador poder cadastrar vários
 * cursos em sequência sem ir e voltar ao dashboard a cada um.
 */
@Component({
  selector: 'app-admin-comunidade-curso-nova',
  imports: [ReactiveFormsModule, RouterLink, UcButton],
  templateUrl: './admin-comunidade-curso-nova.html',
  styleUrl: './admin-comunidade-curso-nova.scss',
})
export class AdminComunidadeCursoNova {
  private readonly formBuilder = inject(FormBuilder);
  private readonly comunidadesService = inject(ComunidadesService);

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    descricao: [''],
  });

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly ultimaCriada = signal<Comunidade | null>(null);

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, descricao } = this.form.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);

    this.comunidadesService.criarComunidadeCurso(nome, descricao || null).subscribe({
      next: (comunidade) => {
        this.enviando.set(false);
        this.ultimaCriada.set(comunidade);
        this.form.reset();
      },
      error: (resposta: HttpErrorResponse) => {
        this.enviando.set(false);
        this.erro.set(this.mensagemDeErro(resposta));
      },
    });
  }

  private mensagemDeErro(resposta: HttpErrorResponse): string {
    const corpo = resposta.error as ErroResponse | null;
    if (corpo?.error?.message) {
      return corpo.error.message;
    }
    return 'Não foi possível criar a comunidade. Tente novamente em instantes.';
  }
}
