import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UcEmptyState } from './empty-state';

@Component({
  imports: [UcEmptyState],
  template: `<uc-empty-state titulo="Nada por aqui" [descricao]="descricao()">
    <button acao class="acao">Criar</button>
  </uc-empty-state>`,
})
class HostComponent {
  readonly descricao = signal<string | undefined>('Ainda não há publicações.');
}

describe('UcEmptyState', () => {
  function criar() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza o título em <b>', () => {
    const b = criar().nativeElement.querySelector('uc-empty-state b') as HTMLElement;
    expect(b.textContent).toBe('Nada por aqui');
  });

  it('renderiza a descrição quando informada e a omite quando ausente', () => {
    const fixture = criar();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('uc-empty-state p')?.textContent).toBe('Ainda não há publicações.');
    fixture.componentInstance.descricao.set(undefined);
    fixture.detectChanges();
    expect(el.querySelector('uc-empty-state p')).toBeNull();
  });

  it('projeta a ação', () => {
    expect(criar().nativeElement.querySelector('uc-empty-state .acao')).not.toBeNull();
  });
});

describe('empty-state.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const norm = readFileSync(join(dir, 'empty-state.scss'), 'utf8').replace(/\s+/g, ' ');

  it('é ligado ao componente via styleUrl', () => {
    expect(readFileSync(join(dir, 'empty-state.ts'), 'utf8')).toContain(
      "styleUrl: './empty-state.scss'",
    );
  });

  it('tem borda tracejada border-strong, raio xl e texto centralizado', () => {
    expect(norm).toContain('border: 1px dashed var(--uc-color-border-strong)');
    expect(norm).toContain('border-radius: var(--uc-radius-xl)');
    expect(norm).toContain('text-align: center');
    expect(norm).toContain('padding: calc(var(--uc-space-unit) * 8) calc(var(--uc-space-unit) * 4)');
  });

  it('título bold em font-size-title e descrição small em ink-soft', () => {
    expect(norm).toContain('font-size: var(--uc-font-size-title)');
    expect(norm).toContain('font-weight: var(--uc-font-weight-bold)');
    expect(norm).toContain('font-size: var(--uc-font-size-small)');
    expect(norm).toContain('color: var(--uc-color-ink-soft)');
  });
});
