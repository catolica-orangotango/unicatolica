import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService, UcButton } from '../../../ui';
import type { Pagina } from '../../comunidades/comunidades.service';
import { AdminService, PerfilPlataforma, UsuarioAdmin } from '../admin.service';

const TAMANHO_PAGINA = 20;
const ERRO_GENERICO = 'Não foi possível concluir agora. Tente novamente em instantes.';

export const ROTULO_PERFIL: Record<PerfilPlataforma, string> = {
  ALUNO: 'Aluno',
  MODERADOR: 'Moderador',
  ADMINISTRADOR: 'Administrador',
};

type Acao = { tipo: 'perfil'; usuario: UsuarioAdmin } | { tipo: 'desativar'; usuario: UsuarioAdmin };

/**
 * Tela "Usuários" da área /admin (KAN-83): lista com busca e filtro, alteração de perfil e
 * desativação/reativação de conta. Perfil e desativação pedem confirmação na própria linha, com o
 * foco no botão de confirmar; o resultado fica na linha (Perfil e Situação em texto), além do toast.
 */
@Component({
  selector: 'app-usuarios',
  imports: [FormsModule, RouterLink, UcButton],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class Usuarios {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  private readonly botaoConfirmar = viewChild<ElementRef<HTMLButtonElement>>('botaoConfirmar');

  protected readonly perfis: PerfilPlataforma[] = ['ALUNO', 'MODERADOR', 'ADMINISTRADOR'];
  protected readonly rotulo = ROTULO_PERFIL;

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly pagina = signal<Pagina<UsuarioAdmin> | null>(null);
  protected readonly erroAcao = signal<string | null>(null);

  protected readonly filtroBusca = signal('');
  protected readonly filtroPerfil = signal<'' | PerfilPlataforma>('');
  protected readonly paginaAtual = signal(0);

  protected readonly acao = signal<Acao | null>(null);
  protected readonly novoPerfil = signal<PerfilPlataforma>('ALUNO');
  protected readonly processandoId = signal<number | null>(null);

  protected readonly meuId = this.authService.usuarioId();

  constructor() {
    this.carregar();
  }

  protected aplicarFiltro(busca: string, perfil: string): void {
    this.filtroBusca.set(busca.trim());
    this.filtroPerfil.set(this.perfis.find((p) => p === perfil) ?? '');
    this.paginaAtual.set(0);
    this.acao.set(null);
    this.carregar();
  }

  protected irParaPagina(numero: number): void {
    this.paginaAtual.set(numero);
    this.acao.set(null);
    this.carregar();
  }

  protected pedirAlteracaoDePerfil(usuario: UsuarioAdmin): void {
    this.novoPerfil.set(usuario.perfil);
    this.abrirConfirmacao({ tipo: 'perfil', usuario });
  }

  protected pedirDesativacao(usuario: UsuarioAdmin): void {
    this.abrirConfirmacao({ tipo: 'desativar', usuario });
  }

  protected escolherPerfil(valor: string): void {
    const perfil = this.perfis.find((p) => p === valor);
    if (perfil) this.novoPerfil.set(perfil);
  }

  protected cancelar(): void {
    this.acao.set(null);
  }

  protected confirmar(): void {
    const acao = this.acao();
    if (!acao || this.processandoId() !== null) return;

    const { usuario } = acao;
    this.processandoId.set(usuario.id);
    this.erroAcao.set(null);

    if (acao.tipo === 'perfil') {
      const perfil = this.novoPerfil();
      this.adminService.alterarPerfil(usuario.id, perfil).subscribe({
        next: (atualizado) =>
          this.aoConcluir(atualizado, `Perfil de ${usuario.nomeCompleto} alterado para ${ROTULO_PERFIL[perfil]}.`),
        error: (erro: HttpErrorResponse) => this.aoFalhar(erro),
      });
    } else {
      this.adminService.alterarSituacao(usuario.id, false).subscribe({
        next: (atualizado) => this.aoConcluir(atualizado, `Conta de ${usuario.nomeCompleto} desativada.`),
        error: (erro: HttpErrorResponse) => this.aoFalhar(erro),
      });
    }
  }

  protected reativar(usuario: UsuarioAdmin): void {
    if (this.processandoId() !== null) return;

    this.acao.set(null);
    this.processandoId.set(usuario.id);
    this.erroAcao.set(null);
    this.adminService.alterarSituacao(usuario.id, true).subscribe({
      next: (atualizado) => this.aoConcluir(atualizado, `Conta de ${usuario.nomeCompleto} reativada.`),
      error: (erro: HttpErrorResponse) => this.aoFalhar(erro),
    });
  }

  protected confirmando(usuario: UsuarioAdmin, tipo: Acao['tipo']): boolean {
    const acao = this.acao();
    return acao?.tipo === tipo && acao.usuario.id === usuario.id;
  }

  private abrirConfirmacao(acao: Acao): void {
    this.erroAcao.set(null);
    this.acao.set(acao);
    setTimeout(() => this.botaoConfirmar()?.nativeElement.focus());
  }

  private aoConcluir(atualizado: UsuarioAdmin, mensagem: string): void {
    this.processandoId.set(null);
    this.acao.set(null);
    this.pagina.update((atual) =>
      atual ? { ...atual, content: atual.content.map((u) => (u.id === atualizado.id ? atualizado : u)) } : atual,
    );
    this.toastService.mostrar(mensagem);
  }

  private aoFalhar(erro: HttpErrorResponse): void {
    this.processandoId.set(null);
    this.acao.set(null);
    const mensagem: unknown = erro.error?.error?.message;
    this.erroAcao.set(erro.status >= 400 && erro.status < 500 && typeof mensagem === 'string' ? mensagem : ERRO_GENERICO);
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.adminService
      .listarUsuarios({
        busca: this.filtroBusca() || undefined,
        perfil: this.filtroPerfil() || undefined,
        pagina: this.paginaAtual(),
        tamanho: TAMANHO_PAGINA,
      })
      .subscribe({
        next: (pagina) => {
          this.pagina.set(pagina);
          this.carregando.set(false);
        },
        error: () => {
          this.carregando.set(false);
          this.erro.set('Não foi possível carregar os usuários agora. Tente novamente em instantes.');
        },
      });
  }
}
