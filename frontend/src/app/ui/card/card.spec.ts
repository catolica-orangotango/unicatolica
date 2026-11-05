import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UcCard } from './card';

@Component({
  imports: [UcCard],
  template: `<uc-card><p class="projected">Conteudo do card</p></uc-card>`,
})
class HostComponent {}

describe('UcCard', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renderiza o elemento host uc-card', () => {
    const host = fixture.nativeElement.querySelector('uc-card') as HTMLElement;
    expect(host).not.toBeNull();
  });

  it('projeta o conteudo passado por ng-content', () => {
    const host = fixture.nativeElement.querySelector('uc-card') as HTMLElement;
    const projected = host.querySelector('.projected');
    expect(projected).not.toBeNull();
    expect(projected!.textContent).toBe('Conteudo do card');
  });
});

// jsdom cannot read computed styles from an external stylesheet; the surface /
// 1px-border / xl-radius / card-padding / no-shadow half of the I/O matrix is
// pinned to the SCSS source (as Story 14.1's tokens.spec.ts does).
describe('card.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const scss = readFileSync(join(dir, 'card.scss'), 'utf8');
  const norm = scss.replace(/\s+/g, ' ');

  it('is wired to the component via styleUrl', () => {
    expect(readFileSync(join(dir, 'card.ts'), 'utf8')).toContain("styleUrl: './card.scss'");
  });

  it('is a bordered surface with xl radius and card padding', () => {
    expect(norm).toContain('display: block');
    expect(norm).toContain('background: var(--uc-color-surface)');
    expect(norm).toContain('border: 1px solid var(--uc-color-border)');
    expect(norm).toContain('border-radius: var(--uc-radius-xl)');
    expect(norm).toContain('padding: var(--uc-space-card-padding)');
  });

  it('uses a border, never a shadow', () => {
    expect(norm).not.toMatch(/box-shadow/);
  });
});
