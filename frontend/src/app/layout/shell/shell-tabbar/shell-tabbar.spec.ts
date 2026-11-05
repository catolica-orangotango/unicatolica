import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModeracaoService } from '../../../features/moderacao/moderacao.service';
import { blocos, foraDeMedia, regra, semComentarios } from '../css-contrato';
import { ShellTabbar } from './shell-tabbar';

@Component({ template: '' })
class TelaVazia {}

@Component({
  imports: [ShellTabbar],
  template: `<app-shell-tabbar
    [privilegiado]="privilegiado()"
    [notificacoesAbertas]="notificacoesAbertas()"
    [naoLidas]="naoLidas()"
    (alternouNotificacoes)="cliques = cliques + 1"
  />`,
})
class Host {
  readonly tabbar = viewChild.required(ShellTabbar);
  readonly privilegiado = signal(false);
  readonly notificacoesAbertas = signal(false);
  readonly naoLidas = signal(0);
  cliques = 0;
}

describe('ShellTabbar - barra de abas do celular (KAN-91)', () => {
  let f: ComponentFixture<Host>;

  async function montar(privilegiado = false, rota = '/feed'): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'feed', component: TelaVazia },
          { path: 'comunidades', component: TelaVazia },
          { path: 'perfil', component: TelaVazia },
          { path: 'moderacao/denuncias', component: TelaVazia },
        ]),
      ],
    });
    await TestBed.inject(Router).navigateByUrl(rota);
    f = TestBed.createComponent(Host);
    f.componentInstance.privilegiado.set(privilegiado);
    document.body.appendChild(f.nativeElement);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
  }

  afterEach(() => f?.nativeElement.remove());

  const el = (): HTMLElement => f.nativeElement as HTMLElement;
  const nav = () => el().querySelector('nav') as HTMLElement;
  const abas = () => [...el().querySelectorAll('.abas__item')] as HTMLElement[];
  const rotulos = () => abas().map((a) => a.querySelector('.abas__rotulo')?.textContent?.trim());
  const aba = (rotulo: string) =>
    abas().find((a) => a.querySelector('.abas__rotulo')?.textContent?.trim() === rotulo) as HTMLElement;

  it('é uma <nav aria-label="Navegação inferior">', async () => {
    await montar();
    expect(nav().getAttribute('aria-label')).toBe('Navegação inferior');
    expect(nav().classList).toContain('abas');
  });

  it('aluno: Início, Comunidades, Notificações e Perfil, nessa ordem', async () => {
    await montar(false);
    expect(rotulos()).toEqual(['Início', 'Comunidades', 'Notificações', 'Perfil']);
  });

  it('moderador e administrador: Início, Comunidades, Denúncias e Perfil, nessa ordem', async () => {
    await montar(true);
    expect(rotulos()).toEqual(['Início', 'Comunidades', 'Denúncias', 'Perfil']);
  });

  it('cada aba tem ícone, e as de rota são links para /feed, /comunidades, /moderacao/denuncias e /perfil', async () => {
    await montar(true);
    expect(abas().every((a) => a.querySelector('uc-icon'))).toBe(true);
    expect(abas().map((a) => a.getAttribute('href'))).toEqual([
      '/feed',
      '/comunidades',
      '/moderacao/denuncias',
      '/perfil',
    ]);
  });

  it('a aba da rota atual tem aria-current="page" e a classe ativa; as outras não', async () => {
    await montar(false, '/comunidades');
    expect(aba('Comunidades').getAttribute('aria-current')).toBe('page');
    expect(aba('Comunidades').classList).toContain('abas__item--ativa');
    for (const outro of ['Início', 'Notificações', 'Perfil']) {
      expect(aba(outro).hasAttribute('aria-current'), outro).toBe(false);
      expect(aba(outro).classList, outro).not.toContain('abas__item--ativa');
    }
  });

  it('Notificações é um botão que controla o painel, com aria-expanded pelo estado', async () => {
    await montar(false);
    const botao = aba('Notificações');
    expect(botao.tagName).toBe('BUTTON');
    expect(botao.getAttribute('type')).toBe('button');
    expect(botao.getAttribute('aria-haspopup')).toBe('menu');
    expect(botao.getAttribute('aria-controls')).toBe('shell-notificacoes');
    expect(botao.getAttribute('aria-expanded')).toBe('false');

    f.componentInstance.notificacoesAbertas.set(true);
    f.detectChanges();
    expect(botao.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicar em Notificações emite alternouNotificacoes', async () => {
    await montar(false);
    aba('Notificações').click();
    expect(f.componentInstance.cliques).toBe(1);
  });

  it('sem não lidas: sem contador e nome acessível "Notificações"', async () => {
    await montar(false);
    expect(aba('Notificações').querySelector('uc-badge')).toBeNull();
    expect(aba('Notificações').getAttribute('aria-label')).toBe('Notificações');
  });

  it('com não lidas: contador visual (aria-hidden) e a contagem no nome acessível', async () => {
    await montar(false);
    f.componentInstance.naoLidas.set(3);
    f.detectChanges();
    const badge = aba('Notificações').querySelector('uc-badge.uc-badge--counter') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('3');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(aba('Notificações').getAttribute('aria-label')).toBe('Notificações (3 não lidas)');
  });

  it('Denúncias mostra o total de pendentes do ModeracaoService, sem buscar de novo', async () => {
    await montar(true);
    expect(aba('Denúncias').querySelector('uc-badge')).toBeNull();
    expect(aba('Denúncias').hasAttribute('aria-label')).toBe(false);

    TestBed.inject(ModeracaoService).pendentes.set(4);
    f.detectChanges();
    expect(aba('Denúncias').querySelector('uc-badge.uc-badge--counter')?.textContent?.trim()).toBe('4');
    expect(aba('Denúncias').getAttribute('aria-label')).toBe('Denúncias (4 pendentes)');
  });

  it('focarNotificacoes() move o foco para a aba Notificações', async () => {
    await montar(false);
    f.componentInstance.tabbar().focarNotificacoes();
    expect(document.activeElement).toBe(aba('Notificações'));
  });
});

describe('shell-tabbar.scss - contrato de estilo', () => {
  const scss = semComentarios(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'shell-tabbar.scss'), 'utf8'),
  );
  const fora = foraDeMedia(scss);
  const celular = blocos(scss, '@media (max-width: bp.$uc-bp-mobile)').join('\n');

  it('acima de $uc-bp-mobile a barra não aparece', () => {
    expect(regra(fora, '.abas')).toMatch(/display:\s*none/);
  });

  it('até $uc-bp-mobile: grade fixa no rodapé, 64px, 4 colunas iguais e filete em cima', () => {
    const abas = regra(celular, '.abas');
    expect(abas).toMatch(/display:\s*grid/);
    expect(abas).toMatch(/position:\s*fixed/);
    expect(abas).toMatch(/bottom:\s*0/);
    expect(abas).toMatch(/height:\s*calc\(var\(--uc-space-unit\) \* 16\)/);
    expect(abas).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(abas).toMatch(/background:\s*var\(--uc-color-bg\)/);
    expect(abas).toMatch(/border-top:\s*1px solid var\(--uc-color-border\)/);
  });

  it('aba: alvo de toque mínimo, rótulo 12px medium em tinta suave', () => {
    const item = regra(fora, '.abas__item');
    expect(item).toMatch(/min-height:\s*var\(--uc-touch-target\)/);
    expect(item).toMatch(/font-size:\s*var\(--uc-font-size-label\)/);
    expect(item).toMatch(/font-weight:\s*var\(--uc-font-weight-medium\)/);
    expect(item).toMatch(/color:\s*var\(--uc-color-ink-soft\)/);
  });

  it('aba ativa: tinta forte e semibold', () => {
    const ativa = regra(fora, '.abas__item--ativa');
    expect(ativa).toMatch(/color:\s*var\(--uc-color-ink\)/);
    expect(ativa).toMatch(/font-weight:\s*var\(--uc-font-weight-semibold\)/);
  });

  it('contador posicionado sobre o ícone, como .tabbar .badge do mockup', () => {
    const badge = regra(fora, '.abas__item .abas__contador');
    expect(badge).toMatch(/position:\s*absolute/);
    expect(badge).toMatch(/top:\s*calc\(var\(--uc-space-unit\) \* 1\.5\)/);
  });
});
