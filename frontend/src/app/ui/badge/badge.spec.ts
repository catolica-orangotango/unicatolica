import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UcBadge, type UcBadgeVariant } from './badge';

@Component({
  imports: [UcBadge],
  template: `<uc-badge [variant]="variant()">{{ label() }}</uc-badge>`,
})
class HostComponent {
  readonly variant = signal<UcBadgeVariant>('course');
  readonly label = signal('Engenharia');
}

describe('UcBadge', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function badgeEl(): HTMLElement {
    return fixture.nativeElement.querySelector('uc-badge') as HTMLElement;
  }

  function modifierClasses(): string[] {
    return [...badgeEl().classList].filter((c) => c.startsWith('uc-badge--'));
  }

  it('exige o input variant (erro de dev time quando ausente)', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [UcBadge] }).compileComponents();
    const bare = TestBed.createComponent(UcBadge);
    expect(() => bare.detectChanges()).toThrow();
  });

  it('variant="course" aplica apenas o modificador uc-badge--course', () => {
    host.variant.set('course');
    fixture.detectChanges();

    expect(badgeEl().classList.contains('uc-badge')).toBe(true);
    expect(modifierClasses()).toEqual(['uc-badge--course']);
  });

  it('variant="open" aplica apenas o modificador uc-badge--open', () => {
    host.variant.set('open');
    fixture.detectChanges();

    expect(modifierClasses()).toEqual(['uc-badge--open']);
  });

  it('troca a classe modificadora quando variant muda', () => {
    host.variant.set('course');
    fixture.detectChanges();
    expect(modifierClasses()).toEqual(['uc-badge--course']);

    host.variant.set('open');
    fixture.detectChanges();
    expect(modifierClasses()).toEqual(['uc-badge--open']);
  });

  it('projeta o texto da label', () => {
    host.label.set('Comunidade aberta');
    fixture.detectChanges();
    expect(badgeEl().textContent?.trim()).toBe('Comunidade aberta');
  });
});

describe('UcBadge variante state', () => {
  it('renderiza o ícone eyeoff (UcIcon sm) antes do texto', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const f = TestBed.createComponent(HostComponent);
    f.componentInstance.variant.set('state');
    f.componentInstance.label.set('Oculto');
    f.detectChanges();
    const el = f.nativeElement.querySelector('uc-badge') as HTMLElement;
    expect(el.classList.contains('uc-badge--state')).toBe(true);
    const icone = el.querySelector('uc-icon') as HTMLElement;
    expect(icone).not.toBeNull();
    expect(icone.classList.contains('uc-icon--sm')).toBe(true);
    expect(el.firstElementChild).toBe(icone);
    expect(el.textContent?.trim()).toBe('Oculto');
  });

  it.each(['counter', 'role', 'course', 'open'] as const)('%s não renderiza ícone', async (v) => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const f = TestBed.createComponent(HostComponent);
    f.componentInstance.variant.set(v);
    f.detectChanges();
    expect(f.nativeElement.querySelector('uc-icon')).toBeNull();
    expect([...(f.nativeElement.querySelector('uc-badge') as HTMLElement).classList]).toContain(
      `uc-badge--${v}`,
    );
  });
});

// jsdom não lê estilos computados de folha externa, então o contrato visual
// é fixado no SCSS de origem, bloco por bloco.
describe('badge.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const scss = readFileSync(join(dir, 'badge.scss'), 'utf8');
  const norm = scss.replace(/\s+/g, ' ');

  function bloco(seletor: string): string {
    const re = new RegExp(
      seletor.replace(/[.()]/g, '\\$&') + '\\s*\\{([^}]*)\\}',
    );
    const m = norm.match(re);
    expect(m, `bloco ${seletor}`).not.toBeNull();
    return m![1];
  }

  it('está ligado ao componente via styleUrl', () => {
    expect(readFileSync(join(dir, 'badge.ts'), 'utf8')).toContain("styleUrl: './badge.scss'");
  });

  it('base: pílula, font-size-label, semibold, sem caixa alta nem letter-spacing', () => {
    const b = bloco(':host');
    expect(b).toContain('border-radius: var(--uc-radius-full)');
    expect(b).toContain('font-size: var(--uc-font-size-label)');
    expect(b).toContain('font-weight: var(--uc-font-weight-semibold)');
    expect(norm).not.toContain('text-transform');
    expect(norm).not.toContain('letter-spacing');
  });

  it('base: o rótulo nunca quebra linha (o selo não vira uma pílula torta em coluna estreita)', () => {
    expect(bloco(':host')).toContain('white-space: nowrap');
  });

  it('counter: fundo maroon, texto surface, 22px mínimos', () => {
    const b = bloco(':host(.uc-badge--counter)');
    expect(b).toContain('background: var(--uc-color-maroon)');
    expect(b).toContain('color: var(--uc-color-surface)');
    expect(b).toMatch(/min-width: 22px/);
    expect(b).toMatch(/height: 22px/);
  });

  it.each(['role', 'course'])('%s: fundo maroon-tint, texto maroon', (v) => {
    const b = bloco(`:host(.uc-badge--${v})`);
    expect(b).toContain('background: var(--uc-color-maroon-tint)');
    expect(b).toContain('color: var(--uc-color-maroon)');
  });

  it('open: fundo surface-strong, texto ink-nav', () => {
    const b = bloco(':host(.uc-badge--open)');
    expect(b).toContain('background: var(--uc-color-surface-strong)');
    expect(b).toContain('color: var(--uc-color-ink-nav)');
  });

  it('state: fundo surface, borda border-strong, texto ink-nav, inline-flex', () => {
    const b = bloco(':host(.uc-badge--state)');
    expect(b).toContain('background: var(--uc-color-surface)');
    expect(b).toContain('border: 1px solid var(--uc-color-border-strong)');
    expect(b).toContain('color: var(--uc-color-ink-nav)');
    expect(b).toContain('display: inline-flex');
  });
});
