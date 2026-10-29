import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { UcButton } from '../button/button';
import { UcIcon } from '../icon/icon';
import { UcNote, type UcNoteTom } from './note';

@Component({
  imports: [UcNote, UcButton],
  template: `<uc-note [tom]="tom()" titulo="Algo aconteceu">
    Detalhe da situação.
    <button acao uc-button variant="secondary" class="acao">Tentar de novo</button>
  </uc-note>`,
})
class HostComponent {
  readonly tom = signal<UcNoteTom>('neutro');
}

describe('UcNote', () => {
  function criar(tom: UcNoteTom) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.tom.set(tom);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('uc-note') as HTMLElement;
    const icone = fixture.debugElement.query(By.directive(UcIcon)).componentInstance as UcIcon;
    return { host, icone };
  }

  it('neutro: role note, ícone info e classe do tom', () => {
    const { host, icone } = criar('neutro');
    expect(host.getAttribute('role')).toBe('note');
    expect(icone.name()).toBe('info');
    expect(host.classList).toContain('uc-note--neutro');
  });

  it('alerta: role note, ícone alert e classe do tom', () => {
    const { host, icone } = criar('alerta');
    expect(host.getAttribute('role')).toBe('note');
    expect(icone.name()).toBe('alert');
    expect(host.classList).toContain('uc-note--alerta');
  });

  it('erro: role alert, ícone alert e classe do tom', () => {
    const { host, icone } = criar('erro');
    expect(host.getAttribute('role')).toBe('alert');
    expect(icone.name()).toBe('alert');
    expect(host.classList).toContain('uc-note--erro');
  });

  it('renderiza o título em <b>, projeta o detalhe e a ação', () => {
    const { host } = criar('erro');
    expect(host.querySelector('b')?.textContent).toBe('Algo aconteceu');
    expect(host.textContent).toContain('Detalhe da situação.');
    expect(host.querySelector('button.acao')?.textContent).toContain('Tentar de novo');
  });
});

describe('note.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const norm = readFileSync(join(dir, 'note.scss'), 'utf8').replace(/\s+/g, ' ');

  it('é ligado ao componente via styleUrl', () => {
    expect(readFileSync(join(dir, 'note.ts'), 'utf8')).toContain("styleUrl: './note.scss'");
  });

  it('neutro: ícone em ink-soft', () => {
    expect(norm).toMatch(/\.uc-note__icone \{[^}]*color: var\(--uc-color-ink-soft\)/);
  });

  it('base: raio lg, fundo surface-muted, texto small', () => {
    expect(norm).toContain('border-radius: var(--uc-radius-lg)');
    expect(norm).toContain('background: var(--uc-color-surface-muted)');
    expect(norm).toContain('font-size: var(--uc-font-size-small)');
  });

  it('alerta usa warn-tint e ícone warn', () => {
    expect(norm).toMatch(/:host\(\.uc-note--alerta\) \{[^}]*background: var\(--uc-color-warn-tint\)/);
    expect(norm).toMatch(/\.uc-note--alerta\) \.uc-note__icone \{ color: var\(--uc-color-warn\)/);
  });

  it('erro usa error-tint e ícone error', () => {
    expect(norm).toMatch(/:host\(\.uc-note--erro\) \{[^}]*background: var\(--uc-color-error-tint\)/);
    expect(norm).toMatch(/\.uc-note--erro\) \.uc-note__icone \{ color: var\(--uc-color-error\)/);
  });
});
