import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { API_BASE_URL } from '../../../core/config/api.config';
import { UcAuthShell } from '../../../layout/auth-shell/auth-shell';
import { UcButton } from '../../../ui/button/button';
import { Curso, CursoService } from '../curso.service';

/**
 * Política de senha (DT-2, KAN-50, decisão em
 * docs/decisoes/2026-10-07-politica-de-senha.md): mínimo 8 caracteres, 1 maiúscula, 1
 * número, 1 caractere especial — mesma regra do `CadastroService.validarPoliticaSenha` no
 * backend. Fonte única: `senhaForteValidator` (bloqueia o envio) e o checklist da tela
 * (`Cadastro.requisitosSenha`) leem daqui, em vez de cada um reimplementar a mesma regra.
 */
const REGRAS_SENHA: ReadonlyArray<{ chave: string; texto: string; cumprida: (valor: string) => boolean }> = [
  { chave: 'minTamanho', texto: 'Mínimo de 8 caracteres', cumprida: (valor) => valor.length >= 8 },
  { chave: 'maiuscula', texto: 'Pelo menos uma letra maiúscula', cumprida: (valor) => /[A-Z]/.test(valor) },
  { chave: 'numero', texto: 'Pelo menos um número', cumprida: (valor) => /[0-9]/.test(valor) },
  { chave: 'especial', texto: 'Pelo menos um caractere especial', cumprida: (valor) => /[^A-Za-z0-9]/.test(valor) },
];

function senhaForteValidator(control: AbstractControl): ValidationErrors | null {
  const valor = (control.value as string | null) ?? '';
  const erros: ValidationErrors = {};
  for (const regra of REGRAS_SENHA) {
    if (!regra.cumprida(valor)) {
      erros[regra.chave] = true;
    }
  }
  return Object.keys(erros).length > 0 ? erros : null;
}

/**
 * Validador de grupo (DT-1): retorna `{ senhasDiferentes: true }` no próprio grupo, nunca
 * via `setErrors` imperativo no controle filho — `setErrors` substitui (não mescla) os
 * erros do controle, então qualquer revalidação de só `confirmarSenha` (ex.: o próprio
 * `Validators.required` rodando de novo) apagaria o erro sem o grupo saber. O template lê
 * o erro em `form.hasError('senhasDiferentes')` (ver `confirmarSenhaComErro`).
 * Não compara quando `senha` ou `confirmarSenha` estão vazios — vazio já é coberto pelo
 * `Validators.required` de cada controle.
 */
function senhasConferemValidator(form: AbstractControl): ValidationErrors | null {
  const senha = form.get('senha');
  const confirmarSenha = form.get('confirmarSenha');
  if (!senha?.value || !confirmarSenha?.value) {
    return null;
  }
  return senha.value === confirmarSenha.value ? null : { senhasDiferentes: true };
}

/**
 * Envelope de erro padrão da API (AD-5) — espelha `ErroResponse` do backend.
 */
interface ErroResponse {
  error: {
    code: string;
    message: string;
    details: string | null;
  };
}

interface CadastroResponse {
  id: number;
  nome: string;
  email: string;
  curso: string;
  emailConfirmado: boolean;
  criadoEm: string;
}

interface RequisitoSenha {
  chave: string;
  texto: string;
  atendido: boolean;
}

/**
 * Tela de cadastro (Story 1.2), restilizada no Design System "Campus Clean" pela
 * Story 14.7. Cobre os critérios de aceite da história: envia nome, e-mail
 * institucional, senha, curso (escolhido da lista de `GET /cursos`) e data de nascimento
 * para `POST /auth/registro`, e exibe as
 * mensagens de rejeição específicas por cenário (e-mail duplicado, domínio externo,
 * validação de campo, idade mínima) — nunca uma mensagem genérica de erro.
 *
 * Depois do 201 a tela troca para o estado "Verifique seu e-mail" (mesmo momento do
 * Flow 1 do EXPERIENCE.md), com o e-mail ecoado e a opção de reenviar a confirmação.
 */
@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule, UcAuthShell, UcButton],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.scss',
})
export class Cadastro {
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);
  private readonly cursoService = inject(CursoService);

  protected readonly cursos = signal<Curso[]>([]);
  protected readonly erroCursos = signal(false);

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly sucesso = signal<CadastroResponse | null>(null);
  protected readonly reenviando = signal(false);
  protected readonly reenviado = signal(false);

  /** Mostra Senha e Confirmar senha em texto puro só enquanto o botão está pressionado. */
  protected readonly mostrarSenhas = signal(false);

  /** Checklist (KAN-50) só aparece depois que o usuário interage com o campo Senha. */
  protected readonly senhaFocada = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      nome: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, senhaForteValidator]],
      confirmarSenha: ['', [Validators.required]],
      cursoId: this.formBuilder.control<number | null>(null, [Validators.required]),
      dataNascimento: ['', [Validators.required]],
    },
    { validators: senhasConferemValidator },
  );

  private readonly senhaValor = toSignal(this.form.controls.senha.valueChanges, { initialValue: '' });

  /**
   * Checklist da política de senha (DT-2, KAN-50) — computado a partir de um signal, não
   * de chamadas a `form.controls.senha.hasError(...)` direto no `@for` do template: isso
   * apresentou um bug de renderização em que um item ficava com o DOM desatualizado
   * quando só ele (não os quatro juntos) mudava de estado numa mesma digitação. Mesma
   * regra de `senhaForteValidator` (`REGRAS_SENHA`), não uma cópia.
   */
  protected readonly requisitosSenha = computed<RequisitoSenha[]>(() => {
    const valor = this.senhaValor() ?? '';
    return REGRAS_SENHA.map((regra) => ({ chave: regra.chave, texto: regra.texto, atendido: regra.cumprida(valor) }));
  });

  constructor() {
    this.cursoService.listar().subscribe({
      next: (cursos) => this.cursos.set(cursos),
      error: () => this.erroCursos.set(true),
    });
  }

  /** `confirmarSenha` só existe no formulário (DT-1); erro de grupo também conta como erro do campo. */
  protected confirmarSenhaComErro(): boolean {
    const confirmarSenha = this.form.controls.confirmarSenha;
    return confirmarSenha.touched && (confirmarSenha.invalid || this.form.hasError('senhasDiferentes'));
  }

  /**
   * Não assume que todo erro de `confirmarSenha` é "senhas não conferem" (pode ser só
   * vazio) — critério de aceite do KAN-48 exige a mensagem (e WCAG 3.3.1/RNF06: só
   * `aria-invalid` sem texto não identifica o erro pra quem usa leitor de tela).
   */
  protected mensagemErroConfirmarSenha(): string {
    if (this.form.controls.confirmarSenha.hasError('required')) {
      return 'Confirme sua senha.';
    }
    if (this.form.hasError('senhasDiferentes')) {
      return 'As senhas não conferem.';
    }
    return '';
  }

  /** `aria-describedby` do campo Senha: erro (se tocado e inválido) e/ou o checklist (se visível). */
  protected senhaDescritoPor(): string | null {
    const partes: string[] = [];
    if (this.form.controls.senha.touched && this.form.controls.senha.invalid) {
      partes.push('erro-senha');
    }
    if (this.senhaFocada()) {
      partes.push('requisitos-senha');
    }
    return partes.length > 0 ? partes.join(' ') : null;
  }

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);
    this.sucesso.set(null);

    // Corpo montado explicitamente com os campos do contrato de POST /auth/registro —
    // confirmarSenha (só do formulário, DT-1) nunca entra aqui.
    const valores = this.form.getRawValue();
    const corpo = {
      nome: valores.nome,
      email: valores.email,
      senha: valores.senha,
      cursoId: valores.cursoId,
      dataNascimento: valores.dataNascimento,
    };

    this.http.post<CadastroResponse>(`${API_BASE_URL}/auth/registro`, corpo).subscribe({
      next: (resposta) => {
        this.enviando.set(false);
        this.sucesso.set(resposta);
        this.form.reset();
      },
      error: (resposta: HttpErrorResponse) => {
        this.enviando.set(false);
        this.erro.set(this.mensagemDeErro(resposta));
      },
    });
  }

  /** Tela "Verifique seu e-mail" (Story 1.3) — opção de reenviar a confirmação. */
  protected reenviarConfirmacao(): void {
    const usuario = this.sucesso();
    if (!usuario || this.reenviando()) {
      return;
    }

    this.reenviando.set(true);
    this.http.post(`${API_BASE_URL}/auth/confirmacao-email/reenvio`, { email: usuario.email }).subscribe({
      next: () => {
        this.reenviando.set(false);
        this.reenviado.set(true);
      },
      error: () => {
        // Backend nunca revela se o e-mail existe (evita enumeração) — sempre 202 aqui,
        // então um erro só acontece por falha de rede/servidor. Mesmo assim não bloqueia
        // o usuário: ele pode tentar de novo.
        this.reenviando.set(false);
      },
    });
  }

  private mensagemDeErro(resposta: HttpErrorResponse): string {
    const corpo = resposta.error as ErroResponse | null;
    if (corpo?.error?.message) {
      return corpo.error.message;
    }
    return 'Não foi possível completar o cadastro. Tente novamente em instantes.';
  }
}
