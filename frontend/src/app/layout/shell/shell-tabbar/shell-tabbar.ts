import { Component, computed, inject, input } from '@angular/core';
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
const CRIAR_ENQUETE: Aba = { rotulo: 'Criar enquete', icone: 'plus', path: '/enquetes/nova' };
const PERFIL: Aba = { rotulo: 'Perfil', icone: 'user', path: '/perfil' };

/**
 * Barra de abas do celular (KAN-91, `.tabbar` de docs/design/kan-84/base.css):
 * Início, Comunidades, a terceira aba (Criar enquete para o aluno, Denúncias
 * para moderador e administrador) e Perfil. Só aparece até $uc-bp-mobile.
 *
 * Notificações não é mais aba (Story 10.2, RN16): o sino mora na barra
 * superior, à esquerda do avatar (`ShellTopbar`). Denúncias lê o total de
 * pendentes já buscado pelo `app-contador-denuncias` do menu lateral, sem
 * disparar outra requisição.
 */
@Component({
  selector: 'app-shell-tabbar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, UcBadge, UcIcon],
  templateUrl: './shell-tabbar.html',
  styleUrl: './shell-tabbar.scss',
})
export class ShellTabbar {
  /** MODERADOR ou ADMINISTRADOR: a terceira aba vira Denúncias. */
  readonly privilegiado = input(false);

  protected readonly inicio = INICIO;
  protected readonly comunidades = COMUNIDADES;
  protected readonly criarEnquete = CRIAR_ENQUETE;
  protected readonly perfil = PERFIL;
  protected readonly pendentes = inject(ModeracaoService).pendentes;

  protected readonly rotuloDenuncias = computed(() => {
    const total = this.pendentes();
    return total ? `Denúncias (${total} pendentes)` : null;
  });
}
