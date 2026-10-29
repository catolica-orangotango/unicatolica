import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UcMenuItem } from '../../../ui';
import { blocos, foraDeMedia, regra, semComentarios } from '../css-contrato';
import { ShellTopbar } from './shell-topbar';

const ITENS: readonly UcMenuItem[] = [
  { id: 'perfil', rotulo: 'Perfil' },
  { id: 'configuracoes', rotulo: 'Configurações', desabilitado: true },
  { id: 'sair', rotulo: 'Sair' },
];

@Component({
  imports: [ShellTopbar],
  template: `<app-shell-topbar
    [gavetaAberta]="gavetaAberta()"
    [(contaAberta)]="contaAberta"
    iniciais="JM"
    cor="azul"
    [itens]="itens"
    (alternouGaveta)="gaveta = gaveta + 1"
    (alternouConta)="conta = conta + 1"
    (selecionou)="escolhidos.push($event)"
  />`,
})
class Host {
  readonly topbar = viewChild.required(ShellTopbar);
  readonly gavetaAberta = signal(false);
  readonly contaAberta = signal(false);
  readonly itens = ITENS;
  gaveta = 0;
  conta = 0;
  readonly escolhidos: string[] = [];
}

describe('ShellTopbar - barra superior do celular (KAN-91)', () => {
  let f: ComponentFixture<Host>;

  beforeEach(async () => {
    f = TestBed.createComponent(Host);
    document.body.appendChild(f.nativeElement);
    f.detectChanges();
    await f.whenStable();
  });

  afterEach(() => f.nativeElement.remove());

  const el = (): HTMLElement => f.nativeElement as HTMLElement;
  const botaoGaveta = () => el().querySelector('.topo__gaveta') as HTMLButtonElement;
  const avatar = () => el().querySelector('.topo__avatar') as HTMLButtonElement;

  it('é um <header> com a marca "U" e o nome UniCatólica', () => {
    const header = el().querySelector('header.topo') as HTMLElement;
    expect(header).toBeTruthy();
    expect(header.querySelector('.topo__marca')?.textContent?.trim()).toBe('U');
    expect(header.querySelector('.topo__marca')?.getAttribute('aria-hidden')).toBe('true');
    expect(header.querySelector('.topo__nome')?.textContent?.trim()).toBe('UniCatólica');
  });

  it('botão "Suas comunidades": ícone users, aria-controls da gaveta e aria-expanded pelo estado', async () => {
    const botao = botaoGaveta();
    expect(botao.getAttribute('type')).toBe('button');
    expect(botao.getAttribute('aria-label')).toBe('Suas comunidades');
    expect(botao.getAttribute('aria-controls')).toBe('shell-sidebar-nav');
    expect(botao.getAttribute('aria-expanded')).toBe('false');
    expect(botao.querySelector('uc-icon')).toBeTruthy();

    f.componentInstance.gavetaAberta.set(true);
    f.detectChanges();
    expect(botao.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicar em "Suas comunidades" emite alternouGaveta', () => {
    botaoGaveta().click();
    expect(f.componentInstance.gaveta).toBe(1);
  });

  it('avatar: botão "Menu da conta" com aria-haspopup, aria-controls e aria-expanded', async () => {
    const botao = avatar();
    expect(botao.getAttribute('aria-label')).toBe('Menu da conta');
    expect(botao.getAttribute('aria-haspopup')).toBe('menu');
    expect(botao.getAttribute('aria-controls')).toBe('shell-menu');
    expect(botao.getAttribute('aria-expanded')).toBe('false');
    expect(botao.querySelector('uc-avatar.uc-avatar--circulo')?.textContent?.trim()).toBe('JM');

    f.componentInstance.contaAberta.set(true);
    f.detectChanges();
    expect(botao.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicar no avatar emite alternouConta', () => {
    avatar().click();
    expect(f.componentInstance.conta).toBe(1);
  });

  it('aberto, o menu da conta lista Perfil, Configurações (desabilitado) e Sair', async () => {
    f.componentInstance.contaAberta.set(true);
    f.detectChanges();
    await f.whenStable();

    const menu = el().querySelector('#shell-menu [role="menu"]') as HTMLElement;
    expect(menu.getAttribute('aria-label')).toBe('Conta');
    const itens = [...menu.querySelectorAll('[role="menuitem"]')] as HTMLButtonElement[];
    expect(itens.map((i) => i.textContent?.trim())).toEqual(['Perfil', 'Configurações', 'Sair']);
    expect(itens[1].getAttribute('aria-disabled')).toBe('true');

    itens[2].click();
    f.detectChanges();
    expect(f.componentInstance.escolhidos).toEqual(['sair']);
    expect(f.componentInstance.contaAberta()).toBe(false);
  });

  it('focarGaveta() e focarConta() movem o foco para os botões', () => {
    f.componentInstance.topbar().focarGaveta();
    expect(document.activeElement).toBe(botaoGaveta());
    f.componentInstance.topbar().focarConta();
    expect(document.activeElement).toBe(avatar());
  });
});

describe('shell-topbar.scss - contrato de estilo', () => {
  const scss = semComentarios(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'shell-topbar.scss'), 'utf8'),
  );
  const fora = foraDeMedia(scss);
  const celular = blocos(scss, '@media (max-width: bp.$uc-bp-mobile)').join('\n');

  it('acima de $uc-bp-mobile a barra não aparece', () => {
    expect(regra(fora, ':host')).toMatch(/display:\s*none/);
  });

  it('até $uc-bp-mobile: 56px, sticky no topo, fundo sólido --uc-color-bg e filete de 1px embaixo', () => {
    const host = regra(celular, ':host');
    expect(host).toMatch(/display:\s*block/);
    expect(host).toMatch(/position:\s*sticky/);
    expect(host).toMatch(/top:\s*0/);
    const topo = regra(celular, '.topo');
    expect(topo).toMatch(/display:\s*flex/);
    expect(topo).toMatch(/height:\s*calc\(var\(--uc-space-unit\) \* 14\)/);
    expect(topo).toMatch(/background:\s*var\(--uc-color-bg\)/);
    expect(topo).toMatch(/border-bottom:\s*1px solid var\(--uc-color-border\)/);
    expect(scss).not.toMatch(/backdrop-filter|rgba\(/);
  });

  it('botões "Suas comunidades" e do avatar têm alvo de toque var(--uc-touch-target)', () => {
    const alvo = regra(fora, '.topo__botao');
    expect(alvo).toMatch(/width:\s*var\(--uc-touch-target\)/);
    expect(alvo).toMatch(/height:\s*var\(--uc-touch-target\)/);
  });

  it('marca de 28px em grená com a inicial branca', () => {
    const marca = regra(fora, '.topo__marca');
    expect(marca).toMatch(/width:\s*calc\(var\(--uc-space-unit\) \* 7\)/);
    expect(marca).toMatch(/background:\s*var\(--uc-color-maroon\)/);
    expect(marca).toMatch(/color:\s*var\(--uc-color-surface\)/);
  });
});
