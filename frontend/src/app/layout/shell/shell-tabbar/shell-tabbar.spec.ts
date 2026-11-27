import { Component, signal } from '@angular/core';
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
  template: `<app-shell-tabbar [privilegiado]="privilegiado()" />`,
})
class Host {
  readonly privilegiado = signal(false);
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

  it('aluno: Início, Comunidades, Criar enquete e Perfil, nessa ordem', async () => {
    await montar(false);
    expect(rotulos()).toEqual(['Início', 'Comunidades', 'Criar enquete', 'Perfil']);
  });

  it('moderador e administrador: Início, Comunidades, Denúncias e Perfil, nessa ordem', async () => {
    await montar(true);
    expect(rotulos()).toEqual(['Início', 'Comunidades', 'Denúncias', 'Perfil']);
  });

  it('cada aba tem ícone, e todas são links para /feed, /comunidades, /enquetes/nova e /perfil', async () => {
    await montar(false);
    expect(abas().every((a) => a.querySelector('uc-icon'))).toBe(true);
    expect(abas().map((a) => a.getAttribute('href'))).toEqual(['/feed', '/comunidades', '/enquetes/nova', '/perfil']);
  });

  it('privilegiado: a terceira aba é um link para /moderacao/denuncias', async () => {
    await montar(true);
    expect(abas().map((a) => a.getAttribute('href'))).toEqual(['/feed', '/comunidades', '/moderacao/denuncias', '/perfil']);
  });

  it('a aba da rota atual tem aria-current="page" e a classe ativa; as outras não', async () => {
    await montar(false, '/comunidades');
    expect(aba('Comunidades').getAttribute('aria-current')).toBe('page');
    expect(aba('Comunidades').classList).toContain('abas__item--ativa');
    for (const outro of ['Início', 'Criar enquete', 'Perfil']) {
      expect(aba(outro).hasAttribute('aria-current'), outro).toBe(false);
      expect(aba(outro).classList, outro).not.toContain('abas__item--ativa');
    }
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
