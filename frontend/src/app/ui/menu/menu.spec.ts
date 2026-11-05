import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UcMenu, type UcMenuItem } from './menu';

const ITENS: UcMenuItem[] = [
  { id: 'perfil', rotulo: 'Meu perfil' },
  { id: 'config', rotulo: 'Configurações', desabilitado: true },
  { id: 'sair', rotulo: 'Sair', perigo: true },
];

@Component({
  imports: [UcMenu],
  template: `<button #gatilho class="gatilho" type="button">Abrir</button>
    <button class="fora" type="button">Fora</button>
    <uc-menu
      rotulo="Menu da conta"
      [itens]="itens()"
      [(aberto)]="aberto"
      [direcao]="direcao()"
      [gatilho]="gatilho"
      (selecionou)="escolhidos.push($event)"
    />`,
})
class HostComponent {
  readonly itens = signal<readonly UcMenuItem[]>(ITENS);
  readonly aberto = signal(false);
  readonly direcao = signal<'abaixo' | 'acima'>('abaixo');
  readonly escolhidos: string[] = [];
}

describe('UcMenu', () => {
  async function criar(aberto = true) {
    const fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.componentInstance.aberto.set(aberto);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const painel = () => el.querySelector('[role="menu"]') as HTMLElement | null;
    const itens = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    const gatilho = el.querySelector('.gatilho') as HTMLButtonElement;
    const teclar = async (key: string) => {
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { fixture, el, painel, itens, gatilho, teclar };
  }

  afterEach(() => document.body.replaceChildren());

  it('fechado não renderiza o painel', async () => {
    const { painel } = await criar(false);
    expect(painel()).toBeNull();
  });

  it('aberto renderiza painel role=menu com aria-label e itens menuitem', async () => {
    const { painel, itens } = await criar();
    expect(painel()?.getAttribute('aria-label')).toBe('Menu da conta');
    expect(itens().map((i) => i.textContent?.trim())).toEqual(['Meu perfil', 'Configurações', 'Sair']);
    expect(itens().every((i) => i.getAttribute('type') === 'button')).toBe(true);
  });

  it('item desabilitado recebe aria-disabled', async () => {
    const { itens } = await criar();
    expect(itens()[1].getAttribute('aria-disabled')).toBe('true');
    expect(itens()[0].hasAttribute('aria-disabled')).toBe(false);
  });

  it('ao abrir, foca o primeiro item habilitado', async () => {
    const { itens } = await criar();
    expect(document.activeElement).toBe(itens()[0]);
  });

  it('clique emite selecionou, fecha e devolve o foco ao gatilho', async () => {
    const { fixture, itens, painel, gatilho } = await criar();
    itens()[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.escolhidos).toEqual(['sair']);
    expect(fixture.componentInstance.aberto()).toBe(false);
    expect(painel()).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it('item desabilitado não emite nem fecha', async () => {
    const { fixture, itens } = await criar();
    itens()[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.escolhidos).toEqual([]);
    expect(fixture.componentInstance.aberto()).toBe(true);
  });

  it('Escape fecha e devolve o foco ao gatilho', async () => {
    const { fixture, gatilho, painel, teclar } = await criar();
    await teclar('Escape');
    expect(fixture.componentInstance.aberto()).toBe(false);
    expect(painel()).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it('ArrowDown/ArrowUp movem o foco, pulam desabilitados e dão a volta', async () => {
    const { itens, teclar } = await criar();
    await teclar('ArrowDown');
    expect(document.activeElement).toBe(itens()[2]);
    await teclar('ArrowDown');
    expect(document.activeElement).toBe(itens()[0]);
    await teclar('ArrowUp');
    expect(document.activeElement).toBe(itens()[2]);
    await teclar('ArrowUp');
    expect(document.activeElement).toBe(itens()[0]);
  });

  it('foco saindo do painel fecha sem roubar o foco', async () => {
    const { fixture, el, painel } = await criar();
    const fora = el.querySelector('.fora') as HTMLButtonElement;
    fora.focus();
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(false);
    expect(painel()).toBeNull();
    expect(document.activeElement).toBe(fora);
  });

  it('foco indo para o próprio gatilho não fecha o menu', async () => {
    const { fixture, gatilho } = await criar();
    gatilho.focus();
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(true);
  });

  it('foco saindo do gatilho para fora fecha o menu', async () => {
    const { fixture, el, gatilho } = await criar();
    gatilho.focus();
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(true);
    (el.querySelector('.fora') as HTMLButtonElement).focus();
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(false);
  });

  it('foco indo do gatilho para um item do painel mantém aberto', async () => {
    const { fixture, gatilho, itens } = await criar();
    gatilho.focus();
    itens()[2].focus();
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(true);
  });

  it('item, gatilho e depois fora (Shift+Tab em sequência) fecha', async () => {
    const { fixture, el, itens, gatilho } = await criar();
    itens()[2].focus();
    gatilho.focus();
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(true);
    (el.querySelector('.fora') as HTMLButtonElement).focus();
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(false);
  });

  it('remove o listener do gatilho ao fechar e ao destruir', async () => {
    const { fixture, gatilho, itens } = await criar();
    const remover = vi.spyOn(gatilho, 'removeEventListener');
    itens()[0].click();
    fixture.detectChanges();
    expect(remover).toHaveBeenCalledWith('focusout', expect.any(Function));
    remover.mockClear();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();
    fixture.destroy();
    expect(remover).toHaveBeenCalledWith('focusout', expect.any(Function));
  });

  it('foco entre itens do painel não fecha', async () => {
    const { fixture, itens } = await criar();
    itens()[2].focus();
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(true);
  });

  it('clique fora fecha; clique no gatilho e dentro do painel não fecham sozinhos', async () => {
    const { fixture, gatilho, painel, el } = await criar();
    gatilho.click();
    painel()!.click();
    expect(fixture.componentInstance.aberto()).toBe(true);
    document.body.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.aberto()).toBe(false);
    expect(el.querySelector('[role="menu"]')).toBeNull();
  });

  it('direcao muda a classe do host', async () => {
    const { fixture, el } = await criar();
    const host = el.querySelector('uc-menu') as HTMLElement;
    expect(host.classList).toContain('uc-menu--abaixo');
    fixture.componentInstance.direcao.set('acima');
    fixture.detectChanges();
    expect(host.classList).toContain('uc-menu--acima');
    expect(host.classList).not.toContain('uc-menu--abaixo');
  });
});

describe('menu.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const norm = readFileSync(join(dir, 'menu.scss'), 'utf8').replace(/\s+/g, ' ');

  it('é ligado ao componente via styleUrl', () => {
    expect(readFileSync(join(dir, 'menu.ts'), 'utf8')).toContain("styleUrl: './menu.scss'");
  });

  it('host: relative e inline-block', () => {
    expect(norm).toMatch(/:host \{[^}]*position: relative[^}]*display: inline-block/);
  });

  it('painel: surface, borda, raio lg e sombra overlay', () => {
    expect(norm).toMatch(/\.uc-menu__painel \{[^}]*background: var\(--uc-color-surface\)/);
    expect(norm).toMatch(/\.uc-menu__painel \{[^}]*border: 1px solid var\(--uc-color-border\)/);
    expect(norm).toMatch(/\.uc-menu__painel \{[^}]*border-radius: var\(--uc-radius-lg\)/);
    expect(norm).toMatch(/\.uc-menu__painel \{[^}]*box-shadow: var\(--uc-shadow-overlay\)/);
  });

  it('abaixo: top 100%; acima: bottom 100%', () => {
    expect(norm).toMatch(/:host\(\.uc-menu--abaixo\) \.uc-menu__painel \{[^}]*top: 100%/);
    expect(norm).toMatch(/:host\(\.uc-menu--acima\) \.uc-menu__painel \{[^}]*bottom: 100%/);
  });

  it('item: altura 40px por space-unit, raio default, texto small medium em ink-nav', () => {
    expect(norm).toMatch(/\.uc-menu__item \{[^}]*height: calc\(var\(--uc-space-unit\) \* 10\)/);
    expect(norm).toMatch(/\.uc-menu__item \{[^}]*border-radius: var\(--uc-radius-default\)/);
    expect(norm).toMatch(/\.uc-menu__item \{[^}]*font-size: var\(--uc-font-size-small\)/);
    expect(norm).toMatch(/\.uc-menu__item \{[^}]*font-weight: var\(--uc-font-weight-medium\)/);
    expect(norm).toMatch(/\.uc-menu__item \{[^}]*color: var\(--uc-color-ink-nav\)/);
  });

  it('hover e foco usam surface-muted', () => {
    expect(norm).toMatch(/\.uc-menu__item:hover[^{]*\{[^}]*background: var\(--uc-color-surface-muted\)/);
    expect(norm).toMatch(/:focus-visible[^{]*\{[^}]*background: var\(--uc-color-surface-muted\)/);
  });

  it('perigo usa error; desabilitado usa ink-disabled', () => {
    expect(norm).toMatch(/\.uc-menu__item--perigo \{[^}]*color: var\(--uc-color-error\)/);
    expect(norm).toMatch(/\.uc-menu__item\[aria-disabled='true'\] \{[^}]*color: var\(--uc-color-ink-disabled\)/);
  });
});
