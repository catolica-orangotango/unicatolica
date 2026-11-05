import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UcButton, UcButtonVariant } from './button';

@Component({
  imports: [UcButton],
  template: `<button uc-button [disabled]="disabled()">Participar</button>`,
})
class HostComponent {
  readonly disabled = signal(false);
}

@Component({
  imports: [UcButton],
  template: `<button uc-button [variant]="variant()" [size]="size()">Acao</button>`,
})
class VariantHostComponent {
  readonly variant = signal<UcButtonVariant>('secondary');
  readonly size = signal<'default' | 'large'>('large');
}

describe('UcButton variantes', () => {
  it('reflete variant e size como classes do host', async () => {
    await TestBed.configureTestingModule({ imports: [VariantHostComponent] }).compileComponents();
    const f = TestBed.createComponent(VariantHostComponent);
    f.detectChanges();
    const el = f.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(el.classList.contains('uc-button--secondary')).toBe(true);
    expect(el.classList.contains('uc-button--primary')).toBe(false);
    expect(el.classList.contains('uc-button--large')).toBe(true);
    f.componentInstance.variant.set('danger');
    f.componentInstance.size.set('default');
    f.detectChanges();
    expect(el.classList.contains('uc-button--danger')).toBe(true);
    expect(el.classList.contains('uc-button--large')).toBe(false);
  });
});

describe('UcButton', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function buttonEl(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[uc-button]') as HTMLButtonElement;
  }

  it('assenta sobre um <button> nativo', () => {
    expect(buttonEl()).not.toBeNull();
    expect(buttonEl().tagName).toBe('BUTTON');
  });

  it('adiciona a classe uc-button ao host', () => {
    expect(buttonEl().classList.contains('uc-button')).toBe(true);
  });

  it('nao define um atributo type (deixa o type nativo para o consumidor)', () => {
    expect(buttonEl().getAttribute('type')).toBeNull();
  });

  it('sem inputs continua sendo o primario no tamanho padrao', () => {
    expect(buttonEl().classList.contains('uc-button--primary')).toBe(true);
    expect(buttonEl().classList.contains('uc-button--large')).toBe(false);
  });

  it('e focavel via teclado, sem tabindex explicito', () => {
    buttonEl().focus();
    expect(document.activeElement).toBe(buttonEl());
    expect(buttonEl().getAttribute('tabindex')).toBeNull();
  });

  it('reflete o disabled nativo e bloqueia o clique quando desabilitado', () => {
    const clickSpy = vi.fn();
    buttonEl().addEventListener('click', clickSpy);

    buttonEl().click();
    expect(clickSpy).toHaveBeenCalledTimes(1);

    host.disabled.set(true);
    fixture.detectChanges();
    expect(buttonEl().disabled).toBe(true);

    buttonEl().click();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

// jsdom nao resolve estilos computados de folhas externas, entao a metade visual
// e fixada contra o fonte SCSS (mesma abordagem do tokens.spec.ts).
describe('button.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const scss = readFileSync(join(dir, 'button.scss'), 'utf8');
  const norm = scss.replace(/\s+/g, ' ');

  function bloco(seletor: string): string {
    const i = norm.indexOf(seletor + ' {');
    expect(i, `seletor ausente: ${seletor}`).toBeGreaterThanOrEqual(0);
    return norm.slice(i, norm.indexOf('}', i));
  }

  it('esta ligado ao componente via styleUrl', () => {
    expect(readFileSync(join(dir, 'button.ts'), 'utf8')).toContain("styleUrl: './button.scss'");
  });

  it('primario: fundo maroon, texto surface, pilula, hover maroon-hover', () => {
    const b = bloco(':host');
    expect(b).toContain('background: var(--uc-color-maroon)');
    expect(b).toContain('color: var(--uc-color-surface)');
    expect(b).toContain('border-radius: var(--uc-radius-full)');
    expect(b).toContain('font-size: var(--uc-font-size-small)');
    expect(b).toContain('font-weight: var(--uc-font-weight-semibold)');
    expect(b).toContain('calc(var(--uc-space-unit) * 9)');
    expect(bloco(':host(.uc-button--primary:hover:not(:disabled):not([aria-disabled=\'true\']))')).toContain(
      'background: var(--uc-color-maroon-hover)',
    );
  });

  it('primario com foco: outline maroon 2px', () => {
    const b = bloco(':host(:focus-visible)');
    expect(b).toContain('outline: 2px solid var(--uc-color-maroon)');
    expect(b).toContain('outline-offset: 2px');
    expect(norm).not.toMatch(/outline:\s*(none|0)\b/);
  });

  it('secundario: fundo surface, borda border-strong, hover surface-muted', () => {
    const b = bloco(':host(.uc-button--secondary)');
    expect(b).toContain('background: var(--uc-color-surface)');
    expect(b).toContain('color: var(--uc-color-ink)');
    expect(b).toContain('border-color: var(--uc-color-border-strong)');
    expect(norm).toMatch(/uc-button--secondary:hover[^{]*\{[^}]*background: var\(--uc-color-surface-muted\)/);
  });

  it('perigo: texto error, borda error-border, hover error-tint', () => {
    const b = bloco(':host(.uc-button--danger)');
    expect(b).toContain('color: var(--uc-color-error)');
    expect(b).toContain('border-color: var(--uc-color-error-border)');
    expect(norm).toMatch(/uc-button--danger:hover[^{]*\{[^}]*background: var\(--uc-color-error-tint\)/);
  });

  it('desabilitado (:disabled e aria-disabled): surface-strong, ink-disabled, sem opacidade', () => {
    const b = bloco(":host(:disabled), :host([aria-disabled='true'])");
    expect(b).toContain('background: var(--uc-color-surface-strong)');
    expect(b).toContain('color: var(--uc-color-ink-disabled)');
    expect(b).toContain('border-color: transparent');
    expect(b).toContain('cursor: not-allowed');
    expect(norm).not.toContain('opacity');
  });

  it('grande: 44px (touch-target) e fonte body', () => {
    const b = bloco(':host(.uc-button--large)');
    expect(b).toContain('height: var(--uc-touch-target)');
    expect(b).toContain('font-size: var(--uc-font-size-body)');
  });

  it('no mobile todo botao tem var(--uc-touch-target) de altura', () => {
    expect(norm).toMatch(
      /@media \(max-width: bp\.\$uc-bp-mobile\) \{ :host \{[^}]*height: var\(--uc-touch-target\)/,
    );
  });
});
