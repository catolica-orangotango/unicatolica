import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComunidadesService } from '../../../core/comunidades/comunidades.service';
import { UsuarioService } from '../../../core/usuario/usuario.service';
import { UcCard } from '../../../ui';

/**
 * Dashboard geral do administrador (home de `/admin`, Story 2.1), no formato do protótipo
 * inicial: quatro indicadores + "Atividade recente".
 *
 * Só mostra o que já é real. Hoje o backend só expõe a contagem de comunidades
 * (`GET /comunidades`, via `totalElements`); usuários, posts por dia e denúncias ainda não
 * têm endpoint (posts dependem do Epic 3) e aparecem como "Em breve" com "—", sem número
 * inventado. Quando cada endpoint entrar no `openapi.yaml`, basta ligar o indicador.
 */
@Component({
  selector: 'app-admin-home',
  imports: [UcCard, RouterLink],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.scss',
})
export class AdminHome {
  private readonly usuarioService = inject(UsuarioService);
  private readonly comunidadesService = inject(ComunidadesService);

  protected readonly agora = new Date();
  protected readonly nome = signal<string | null>(null);
  protected readonly totalComunidades = signal<number | null>(null);
  protected readonly totalComunidadesCurso = signal<number | null>(null);
  protected readonly totalComunidadesAbertas = computed(() => {
    const total = this.totalComunidades();
    const curso = this.totalComunidadesCurso();
    return total === null || curso === null ? null : total - curso;
  });

  constructor() {
    // Best-effort: o dashboard continua útil (com os indicadores "em breve") mesmo se
    // algum dado falhar — nada aqui bloqueia a tela.
    this.usuarioService.me().subscribe({
      next: (usuario) => this.nome.set(usuario.nome),
      error: () => undefined,
    });
    this.comunidadesService.listar({ tamanho: 1 }).subscribe({
      next: (pagina) => this.totalComunidades.set(pagina.totalElements),
      error: () => undefined,
    });
    this.comunidadesService.listar({ tipo: 'CURSO', tamanho: 1 }).subscribe({
      next: (pagina) => this.totalComunidadesCurso.set(pagina.totalElements),
      error: () => undefined,
    });
  }
}
