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

// jsdom cannot read computed styles from an external stylesheet, so the pill /
// maroon-tint / per-variant text-colour half of the I/O matrix is pinned to the
// SCSS source (as Story 14.1's tokens.spec.ts does).
describe('badge.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const scss = readFileSync(join(dir, 'badge.scss'), 'utf8');
  const norm = scss.replace(/\s+/g, ' ');

  it('is wired to the component via styleUrl', () => {
    expect(readFileSync(join(dir, 'badge.ts'), 'utf8')).toContain("styleUrl: './badge.scss'");
  });

  it('is a pill with the maroon-tint token background', () => {
    expect(norm).toContain('border-radius: var(--uc-radius-full)');
    expect(norm).toContain('background: var(--uc-color-maroon-tint)');
  });

  it('course and open text are both maroon, on the two modifier classes', () => {
    expect(norm).toMatch(/:host\(\.uc-badge--course\)\s*\{[^}]*color: var\(--uc-color-maroon\)/);
    expect(norm).toMatch(/:host\(\.uc-badge--open\)\s*\{[^}]*color: var\(--uc-color-maroon\)/);
  });
});
