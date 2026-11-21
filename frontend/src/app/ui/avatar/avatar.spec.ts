import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UcAvatar, corDoAvatar, type UcAvatarCor } from './avatar';

@Component({
  imports: [UcAvatar],
  template: `<uc-avatar iniciais="GT" [cor]="cor()" [forma]="forma()" [tamanho]="tamanho()" [fotoUrl]="fotoUrl()" />`,
})
class HostComponent {
  readonly cor = signal<UcAvatarCor>('neutro');
  readonly forma = signal<'circulo' | 'quadrado'>('circulo');
  readonly tamanho = signal<'sm' | 'md' | 'lg'>('md');
  readonly fotoUrl = signal<string | null>(null);
}

describe('UcAvatar', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement.querySelector('uc-avatar') as HTMLElement;
  const mods = () => [...el().classList].filter((c) => c.startsWith('uc-avatar--')).sort();

  it('mostra as iniciais com aria-hidden (o nome acessível vem do contexto)', () => {
    const texto = el().querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(texto.textContent?.trim()).toBe('GT');
  });

  it('padrão: neutro, círculo, md', () => {
    expect(mods()).toEqual(['uc-avatar--circulo', 'uc-avatar--md', 'uc-avatar--neutro']);
  });

  it('aplica modificadores de cor, forma e tamanho', () => {
    host.cor.set('violeta');
    host.forma.set('quadrado');
    host.tamanho.set('lg');
    fixture.detectChanges();
    expect(mods()).toEqual(['uc-avatar--lg', 'uc-avatar--quadrado', 'uc-avatar--violeta']);
  });

  it('com fotoUrl mostra a imagem decorativa (alt vazio) no lugar das iniciais', () => {
    host.fotoUrl.set('https://s3.exemplo/foto.png');
    fixture.detectChanges();
    const img = el().querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://s3.exemplo/foto.png');
    expect(img.getAttribute('alt')).toBe('');
    expect(el().textContent?.trim()).toBe('');
  });

  it('sem fotoUrl mostra as iniciais e nenhuma imagem', () => {
    expect(el().querySelector('img')).toBeNull();
    expect(el().textContent?.trim()).toBe('GT');
  });

  it('se a imagem falhar ao carregar, volta às iniciais', () => {
    host.fotoUrl.set('https://s3.exemplo/quebrada.png');
    fixture.detectChanges();
    el().querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(el().querySelector('img')).toBeNull();
    expect(el().textContent?.trim()).toBe('GT');
  });

  it('corDoAvatar mapeia (id - 1) % 4', () => {
    expect([1, 2, 3, 4].map(corDoAvatar)).toEqual(['azul', 'verde', 'areia', 'violeta']);
    expect(corDoAvatar(5)).toBe('azul');
  });
});

describe('avatar.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const norm = readFileSync(join(dir, 'avatar.scss'), 'utf8').replace(/\s+/g, ' ');

  it('marca: fundo maroon e texto surface', () => {
    expect(norm).toMatch(/:host\(\.uc-avatar--marca\)\s*\{[^}]*background: var\(--uc-color-maroon\)[^}]*color: var\(--uc-color-surface\)/);
  });

  it('marca-suave: fundo maroon-tint e texto maroon', () => {
    expect(norm).toMatch(/:host\(\.uc-avatar--marca-suave\)\s*\{[^}]*background: var\(--uc-color-maroon-tint\)[^}]*color: var\(--uc-color-maroon\)/);
  });

  for (const [cor, token] of [['azul', 'blue'], ['verde', 'green'], ['areia', 'sand'], ['violeta', 'violet']]) {
    it(`${cor}: par avatar-${token} sobre avatar-${token}-bg`, () => {
      expect(norm).toMatch(
        new RegExp(`:host\\(\\.uc-avatar--${cor}\\)\\s*\\{[^}]*background: var\\(--uc-color-avatar-${token}-bg\\)[^}]*color: var\\(--uc-color-avatar-${token}\\)`),
      );
    });
  }

  it('neutro: surface-strong com ink-nav', () => {
    expect(norm).toMatch(/:host\(\.uc-avatar--neutro\)\s*\{[^}]*background: var\(--uc-color-surface-strong\)[^}]*color: var\(--uc-color-ink-nav\)/);
  });

  it('círculo usa radius-full e quadrado usa radius-default', () => {
    expect(norm).toMatch(/:host\(\.uc-avatar--circulo\)\s*\{[^}]*border-radius: var\(--uc-radius-full\)/);
    expect(norm).toMatch(/:host\(\.uc-avatar--quadrado\)\s*\{[^}]*border-radius: var\(--uc-radius-default\)/);
  });
});
