import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService, UcButton } from '../../../ui';
import { ComunidadesService, LIMITE_NOME_COMUNIDADE } from '../comunidades.service';

/** Criar comunidade aberta (Story 2.2) — rota `/comunidades/nova`. */
@Component({
  selector: 'app-criar-comunidade',
  imports: [ReactiveFormsModule, RouterLink, UcButton],
  templateUrl: './criar-comunidade.html',
  styleUrl: './criar-comunidade.scss',
})
export class CriarComunidade {
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly limiteNome = LIMITE_NOME_COMUNIDADE;
  protected readonly salvando = signal(false);
  protected readonly erroSalvar = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    // Só espaços conta como vazio, igual ao backend (RF22).
    nome: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(LIMITE_NOME_COMUNIDADE)]],
    descricao: [''],
  });

  protected criar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, descricao } = this.form.getRawValue();
    this.salvando.set(true);
    this.erroSalvar.set(null);
    this.comunidadesService.criar({ nome: nome.trim(), descricao: descricao.trim() || null }).subscribe({
      next: (comunidade) => {
        this.toastService.mostrar(`Comunidade ${comunidade.nome} criada`);
        this.router.navigate(['/comunidades', comunidade.id]);
      },
      error: (erro: HttpErrorResponse) => {
        this.salvando.set(false);
        const mensagem: unknown = erro.error?.error?.message;
        this.erroSalvar.set(
          (erro.status === 409 || erro.status === 422) && typeof mensagem === 'string'
            ? mensagem
            : 'Não foi possível criar a comunidade agora. Tente novamente em instantes.',
        );
      },
    });
  }
}
