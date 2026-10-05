import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Chave do instante da última atividade, compartilhada entre as abas. */
const ULTIMA_ATIVIDADE_KEY = 'pacext.ultimaAtividade';

/** Eventos que contam como atividade do usuário. */
const EVENTOS_DE_ATIVIDADE = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'];

/** Intervalo entre verificações da sessão. */
const VERIFICACAO_MS = 15_000;

/** Grava a atividade no localStorage no máximo uma vez a cada 5 s (pointermove dispara muito). */
const GRAVACAO_MINIMA_MS = 5_000;

/**
 * Sessão por inatividade (KAN-78). O token vale o tempo de inatividade configurado no
 * backend (`exp - iat`, padrão 15 min). Enquanto o usuário está ativo, o token é trocado por
 * um novo antes de vencer; depois desse tempo sem atividade, a sessão é encerrada e a tela
 * volta para o login, mesmo sem nenhuma requisição.
 *
 * A última atividade fica no localStorage para valer entre abas: quem usa uma aba mantém as
 * outras logadas, e uma aba parada não derruba a que está em uso.
 */
@Injectable({ providedIn: 'root' })
export class SessaoAtividadeService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private intervalo: ReturnType<typeof setInterval> | null = null;
  private ultimaGravacao = 0;
  private renovando = false;
  private readonly aoAgir = () => this.registrarAtividade();

  /** Começa a acompanhar a atividade. Chamado pela casca autenticada (`Shell`). */
  iniciar(): void {
    if (this.intervalo !== null) {
      return;
    }
    this.registrarAtividade(true);
    for (const evento of EVENTOS_DE_ATIVIDADE) {
      document.addEventListener(evento, this.aoAgir, { capture: true, passive: true });
    }
    this.intervalo = setInterval(() => this.verificar(), VERIFICACAO_MS);
  }

  parar(): void {
    if (this.intervalo === null) {
      return;
    }
    clearInterval(this.intervalo);
    this.intervalo = null;
    for (const evento of EVENTOS_DE_ATIVIDADE) {
      document.removeEventListener(evento, this.aoAgir, { capture: true });
    }
  }

  /**
   * Encerra a sessão se o token venceu ou se passou o tempo de inatividade sem atividade em
   * nenhuma aba; senão, renova o token quando falta menos da metade do prazo e houve
   * atividade depois da emissão. Público para os testes chamarem sem esperar o intervalo.
   */
  verificar(agora = Date.now()): void {
    const periodo = this.auth.periodoDoToken();
    if (!periodo) {
      return;
    }
    const inatividade = periodo.expiraEm - periodo.emitidoEm;
    const ultimaAtividade = this.ultimaAtividade();

    if (agora >= periodo.expiraEm || agora - ultimaAtividade >= inatividade) {
      this.parar();
      this.auth.encerrarSessaoLocal();
      this.router.navigate(['/login'], { queryParams: { sessao: 'expirada' } });
      return;
    }

    const faltaMenosDaMetade = periodo.expiraEm - agora < inatividade / 2;
    if (faltaMenosDaMetade && ultimaAtividade > periodo.emitidoEm && !this.renovando) {
      this.renovando = true;
      // Erro (401) já é tratado pelo sessaoExpiradaInterceptor; aqui só libera nova tentativa.
      this.auth.renovar().subscribe({
        next: () => (this.renovando = false),
        error: () => (this.renovando = false),
      });
    }
  }

  private registrarAtividade(forcar = false): void {
    const agora = Date.now();
    if (!forcar && agora - this.ultimaGravacao < GRAVACAO_MINIMA_MS) {
      return;
    }
    this.ultimaGravacao = agora;
    try {
      localStorage.setItem(ULTIMA_ATIVIDADE_KEY, String(agora));
    } catch {
      // Sem localStorage, vale só a atividade desta aba (ultimaGravacao).
    }
  }

  /** A mais recente entre esta aba e as outras (localStorage). */
  private ultimaAtividade(): number {
    let compartilhada = 0;
    try {
      compartilhada = Number(localStorage.getItem(ULTIMA_ATIVIDADE_KEY)) || 0;
    } catch {
      // Sem localStorage, vale só esta aba.
    }
    return Math.max(this.ultimaGravacao, compartilhada);
  }
}
