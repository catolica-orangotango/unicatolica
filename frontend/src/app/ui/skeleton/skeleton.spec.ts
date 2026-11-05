import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TestBed } from '@angular/core/testing';
import { UcSkeleton } from './skeleton';

describe('UcSkeleton', () => {
  it('é decorativo: aria-hidden="true" no host', () => {
    const fixture = TestBed.createComponent(UcSkeleton);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });
});

describe('skeleton.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const norm = readFileSync(join(dir, 'skeleton.scss'), 'utf8').replace(/\s+/g, ' ');

  it('é ligado ao componente via styleUrl', () => {
    expect(readFileSync(join(dir, 'skeleton.ts'), 'utf8')).toContain("styleUrl: './skeleton.scss'");
  });

  it('tem gradiente estático de surface-strong e surface-muted, raio default e altura em calc', () => {
    expect(norm).toContain('display: block');
    expect(norm).toContain(
      'linear-gradient( 90deg, var(--uc-color-surface-strong), var(--uc-color-surface-muted), var(--uc-color-surface-strong) )',
    );
    expect(norm).toContain('border-radius: var(--uc-radius-default)');
    expect(norm).toContain('height: calc(var(--uc-space-unit) * 3)');
  });

  it('não tem animação', () => {
    expect(norm).not.toMatch(/animation|@keyframes|transition/);
  });
});
