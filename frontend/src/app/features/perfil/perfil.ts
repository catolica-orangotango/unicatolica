import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PerfilAcademico, PerfilService } from '../../core/perfil/perfil.service';
import { ToastService, UcButton, UcCard } from '../../ui';

/** Envelope de erro padrão da API (AD-5) — espelha `ErroResponse` do backend. */
interface ErroResponse {
  error: {
    code: string;
    message: string;
    details: string | null;
  };
}

/**
 * Épico 4 (Perfil Acadêmico) — uma única tela pras Stories 4.1, 4.2 e 4.4, como o
 * EXPERIENCE.md pede ("mesma tela do perfil próprio, sem controles de edição"):
 *
 * - Rota `/perfil` (sem `:id` na URL) — o próprio perfil, editável (Stories 4.1/4.2).
 * - Rota `/perfil/:id` — perfil de outro usuário, sempre só leitura (Story 4.4,
 *   RF20.2), mesmo que `:id` calhe de ser o próprio — quem quer editar o próprio usa
 *   o link "Perfil" do menu da conta, que sempre aponta pra `/perfil` sem id.
 *
 * Período e interesses (RF17/RF18) não fazem parte do `FormGroup` reativo: interesses é
 * uma lista de tags que cresce/encolhe por clique, não um campo de texto único, então
 * vive num signal próprio (mais simples que um `FormArray` pra este caso).
 */
@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, UcButton, UcCard],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil {
  private readonly route = inject(ActivatedRoute);
  private readonly perfilService = inject(PerfilService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  /** `null` na URL (`/perfil`) = próprio perfil, editável. */
  protected readonly usuarioId = this.route.snapshot.paramMap.get('id');
  protected readonly somenteLeitura = this.usuarioId !== null;

  protected readonly carregando = signal(true);
  protected readonly erroCarregar = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erroSalvar = signal<string | null>(null);
  protected readonly perfil = signal<PerfilAcademico | null>(null);

  protected readonly interesses = signal<string[]>([]);
  protected readonly novoInteresse = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', Validators.required],
    curso: [''],
    periodo: this.formBuilder.control<number | null>(null),
  });

  constructor() {
    const busca = this.usuarioId
      ? this.perfilService.obter(Number(this.usuarioId))
      : this.perfilService.me();

    busca.subscribe({
      next: (perfil) => {
        this.carregando.set(false);
        this.perfil.set(perfil);
        this.interesses.set(perfil.interesses);
        if (!this.somenteLeitura) {
          this.form.setValue({ nome: perfil.nome, curso: perfil.curso ?? '', periodo: perfil.periodo });
        }
      },
      error: () => {
        this.carregando.set(false);
        this.erroCarregar.set(
          this.somenteLeitura
            ? 'Não foi possível carregar este perfil.'
            : 'Não foi possível carregar seu perfil. Tente novamente em instantes.',
        );
      },
    });
  }

  protected adicionarInteresse(): void {
    const texto = this.novoInteresse().trim();
    if (!texto || this.interesses().includes(texto)) {
      this.novoInteresse.set('');
      return;
    }
    this.interesses.update((lista) => [...lista, texto]);
    this.novoInteresse.set('');
  }

  protected removerInteresse(alvo: string): void {
    this.interesses.update((lista) => lista.filter((interesse) => interesse !== alvo));
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, curso, periodo } = this.form.getRawValue();
    this.salvando.set(true);
    this.erroSalvar.set(null);

    this.perfilService
      .salvar({ nome, curso: curso || null, periodo, interesses: this.interesses() })
      .subscribe({
        next: (perfil) => {
          this.salvando.set(false);
          this.perfil.set(perfil);
          this.toastService.mostrar('Perfil salvo.');
        },
        error: (resposta: HttpErrorResponse) => {
          this.salvando.set(false);
          this.erroSalvar.set(this.mensagemDeErro(resposta));
        },
      });
  }

  private mensagemDeErro(resposta: HttpErrorResponse): string {
    const corpo = resposta.error as ErroResponse | null;
    if (corpo?.error?.message) {
      return corpo.error.message;
    }
    return 'Não foi possível salvar seu perfil. Tente novamente em instantes.';
  }
}
