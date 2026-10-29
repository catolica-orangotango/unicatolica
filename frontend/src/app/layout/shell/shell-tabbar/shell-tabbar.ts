import { Component, ElementRef, computed, inject, input, output, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ModeracaoService } from '../../../features/moderacao/moderacao.service';
import { UcBadge, UcIcon, type UcIconName } from '../../../ui';

/** Uma aba de rota da barra inferior. */
interface Aba {
  rotulo: string;
  icone: UcIconName;
  path: string;
}

const INICIO: Aba = { rotulo: 'Início', icone: 'home', path: '/feed' };
const COMUNIDADES: Aba = { rotulo: 'Comunidades', icone: 'users', path: '/comunidades' };
const PERFIL: Aba = { rotulo: 'Perfil', icone: 'user', path: '/perfil' };

/**
 * Barra de abas do celular (KAN-91, `.tabbar` de docs/design/kan-84/base.css):
 * Início, Comunidades, a terceira aba (Notificações para o aluno, Denúncias
 * para moderador e administrador) e Perfil. Só aparece até $uc-bp-mobile.
 *
 * Notificações é um botão: abre o painel único da casca (via
 * {@link alternouNotificacoes}). Denúncias lê o total de pendentes já buscado
 * pelo `app-contador-denuncias` do menu lateral, sem disparar outra requisição.
 */
@Component({
  selector: 'app-shell-tabbar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, UcBadge, UcIcon],
  templateUrl: './shell-tabbar.html',
  styleUrl: './shell-tabbar.scss',
})
export class ShellTabbar {
  private readonly botaoNotificacoes = viewChild<ElementRef<HTMLButtonElement>>('botaoNotificacoes');

  /** MODERADOR ou ADMINISTRADOR: a terceira aba vira Denúncias. */
  readonly privilegiado = input(false);
  readonly notificacoesAbertas = input(false);
  readonly naoLidas = input(0);
  readonly alternouNotificacoes = output<MouseEvent>();

  protected readonly inicio = INICIO;
  protected readonly comunidades = COMUNIDADES;
  protected readonly perfil = PERFIL;
  protected readonly pendentes = inject(ModeracaoService).pendentes;

  /** Nome acessível: o contador visual é `aria-hidden`, então a contagem vai aqui. */
  protected readonly rotuloNotificacoes = computed(() => {
    const naoLidas = this.naoLidas();
    return naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : 'Notificações';
  });

  protected readonly rotuloDenuncias = computed(() => {
    const total = this.pendentes();
    return total ? `Denúncias (${total} pendentes)` : null;
  });

  /** Devolve o foco à aba Notificações (a casca chama ao fechar o painel aberto por ela). */
  focarNotificacoes(): void {
    this.botaoNotificacoes()?.nativeElement.focus();
  }
}
