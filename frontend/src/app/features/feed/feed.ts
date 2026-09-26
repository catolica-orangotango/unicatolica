import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Comunidade, ComunidadesService } from '../comunidades/comunidades.service';
import { Usuario, UsuarioService } from '../identidade/usuario.service';
import { ToastService, UcBadge, UcButton, UcCard } from '../../ui';

/** Prefixo da chave de localStorage que marca "já mostrei o toast de auto-join desta comunidade". */
const CHAVE_TOAST_AUTOJOIN = 'pacext.autojoin-toast.';

/**
 * Home — renderiza dentro do `<router-outlet>` do `Shell` (`layout/shell/`), que já
 * cobre navegação global e o menu de conta/logout (Story 14.3) — este componente só
 * preenche o conteúdo. Modelo visual "Telas-Chave UniCatólica" (ver
 * docs/decisoes/2026-08-modelo-epico-2-comunidades.md e a home-comunidade.html do bmad), reconstruído
 * sobre os primitivos oficiais do Design System (Story 14.2: `uc-card`, `uc-badge`,
 * `uc-button`, `uc-member-indicator`) depois que eles aterrissaram na main.
 *
 * Só mostra o que já é real: saudação (RF12), "Suas comunidades" e descoberta de
 * comunidades abertas (Epic 2). O feed de publicações do mockup é fabricado
 * (Publicações é outro Épico, ainda sem backend) — por isso vira um aviso "em breve"
 * em vez de posts inventados.
 */
@Component({
  selector: 'app-feed',
  imports: [RouterLink, UcBadge, UcButton, UcCard],
  templateUrl: './feed.html',
  styleUrl: './feed.scss',
})
export class Feed {
  private readonly usuarioService = inject(UsuarioService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly toastService = inject(ToastService);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly descobrir = signal<Comunidade[]>([]);
  protected readonly ingressandoId = signal<number | null>(null);

  protected readonly iniciais = computed(() => {
    const nome = this.usuario()?.nome ?? '';
    return nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() ?? '')
      .join('');
  });

  constructor() {
    this.carregar();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    // `carregarMinhas()` também atualiza a cache compartilhada que o Shell usa pra
    // "Suas comunidades" na sidebar — não é só pro filtro abaixo.
    forkJoin({
      usuario: this.usuarioService.me(),
      minhas: this.comunidadesService.carregarMinhas(),
      abertas: this.comunidadesService.listar({ tipo: 'ABERTA', tamanho: 6 }),
    }).subscribe({
      next: ({ usuario, minhas, abertas }) => {
        const idsQueJaSouMembro = new Set(minhas.map((comunidade) => comunidade.id));
        this.usuario.set(usuario);
        this.descobrir.set(abertas.content.filter((comunidade) => !idsQueJaSouMembro.has(comunidade.id)));
        this.mostrarToastAutoJoinSeNecessario(minhas);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Não foi possível carregar sua Home agora. Tente novamente em instantes.');
      },
    });
  }

  /**
   * Story 2.3 (RF24.1) — "na minha próxima visita ao Início, vejo um toast único
   * 'Você já faz parte de {comunidade do curso} 🎓'". O auto-join acontece no
   * cadastro, no backend — o frontend não tem como saber "isso acabou de
   * acontecer", então usa localStorage pra mostrar uma vez só, na primeira vez que
   * a Home carrega com essa comunidade já na lista (nunca mais depois disso, nem
   * que o usuário limpe cache de outro jeito — best-effort, não é garantia forte).
   */
  private mostrarToastAutoJoinSeNecessario(minhas: Comunidade[]): void {
    const comunidadeDeCurso = minhas.find((comunidade) => comunidade.tipo === 'CURSO');
    if (!comunidadeDeCurso) {
      return;
    }

    const chave = `${CHAVE_TOAST_AUTOJOIN}${comunidadeDeCurso.id}`;
    try {
      if (localStorage.getItem(chave)) {
        return;
      }
      localStorage.setItem(chave, '1');
    } catch {
      // localStorage indisponível (aba privada, cookies bloqueados etc.) — sem
      // como marcar "já mostrei", então nem mostra, pra não repetir a cada visita.
      return;
    }

    this.toastService.mostrar(`Você já faz parte de ${comunidadeDeCurso.nome} 🎓`);
  }

  /** Story 2.4 (RF24) — ingressa direto da Home, sem passar pela lista completa. */
  protected ingressar(comunidade: Comunidade): void {
    if (this.ingressandoId() !== null) {
      return;
    }

    this.ingressandoId.set(comunidade.id);
    this.comunidadesService.ingressar(comunidade.id, comunidade.nome).subscribe({
      next: () => {
        this.ingressandoId.set(null);
        this.descobrir.update((lista) => lista.filter((item) => item.id !== comunidade.id));
        // Cache de "minhas comunidades" (sidebar) já foi atualizada pelo próprio
        // ComunidadesService.ingressar() — nada a fazer aqui além do filtro acima.
      },
      error: () => {
        // Provável corrida rara (já é membro) — recarrega pra refletir o estado real
        // em vez de deixar o botão "preso" em "Entrando…".
        this.ingressandoId.set(null);
        this.carregar();
      },
    });
  }
}
