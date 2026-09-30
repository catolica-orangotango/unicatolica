import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PerfilCartao } from '../perfil-cartao/perfil-cartao';
import { Perfil, PerfilService } from '../perfil.service';

/**
 * Perfil de outro usuário (Story 4.4, RF20.2) — rota `/usuarios/:id`, aberta pelo nome do
 * autor de uma postagem. Somente leitura: sem controles de edição nem dado sensível.
 */
@Component({
  selector: 'app-perfil-usuario',
  imports: [PerfilCartao],
  templateUrl: './perfil-usuario.html',
  styleUrl: './perfil-usuario.scss',
})
export class PerfilUsuario {
  private readonly route = inject(ActivatedRoute);
  private readonly perfilService = inject(PerfilService);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly perfil = signal<Perfil | null>(null);

  constructor() {
    // Componente recriado a cada navegação para outro :id (mesmo padrão de ComunidadeDetalhe).
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.perfilService.deUsuario(id).subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.carregando.set(false);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(
          erro.status === 404
            ? 'Esse usuário não existe ou não está mais na UniCatólica.'
            : 'Não foi possível carregar esse perfil agora. Tente novamente em instantes.',
        );
      },
    });
  }
}
