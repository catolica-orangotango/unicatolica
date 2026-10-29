import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UcButton } from './button';

@Component({
  imports: [UcButton],
  template: `<button uc-button [disabled]="disabled()">Participar</button>`,
})
class HostComponent {
  readonly disabled = signal(false);
}

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

// jsdom does not resolve computed styles from an external stylesheet, so the
// visual half of the I/O matrix (strong-action fill, pill, the :focus-visible
// maroon outline, the [disabled] dim) is pinned against the SCSS source - same
// approach as Story 14.1's tokens.spec.ts.
describe('button.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const scss = readFileSync(join(dir, 'button.scss'), 'utf8');
  const norm = scss.replace(/\s+/g, ' ');

  it('is wired to the component via styleUrl', () => {
    expect(readFileSync(join(dir, 'button.ts'), 'utf8')).toContain("styleUrl: './button.scss'");
  });

  it('fills with the maroon token, surface text, pill radius', () => {
    expect(norm).toContain('background: var(--uc-color-maroon)');
    expect(norm).toContain('color: var(--uc-color-surface)');
    expect(norm).toContain('border-radius: var(--uc-radius-full)');
  });

  it('shows a var(--uc-color-maroon) keyboard-focus outline on :focus-visible', () => {
    expect(norm).toMatch(
      /:host\(:focus-visible\)\s*\{[^}]*outline: 2px solid var\(--uc-color-maroon\)/,
    );
    expect(norm).toMatch(/:host\(:focus-visible\)\s*\{[^}]*outline-offset: 2px/);
  });

  it('never suppresses the focus ring with outline: none / outline: 0', () => {
    expect(norm).not.toMatch(/outline:\s*(none|0)\b/);
  });

  it('dims and blocks the cursor on :disabled (matches [disabled] and fieldset[disabled])', () => {
    expect(norm).toMatch(/:host\(:disabled\)\s*\{[^}]*opacity: 0\.5/);
    expect(norm).toMatch(/:host\(:disabled\)\s*\{[^}]*cursor: not-allowed/);
    expect(norm).not.toMatch(/:host\(\[disabled\]\)/);
  });
});
