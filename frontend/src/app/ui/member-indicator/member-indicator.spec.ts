import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UcMemberIndicator, type UcMemberIndicatorEstado } from './member-indicator';

describe('UcMemberIndicator', () => {
  let fixture: ComponentFixture<UcMemberIndicator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UcMemberIndicator] }).compileComponents();
    fixture = TestBed.createComponent(UcMemberIndicator);
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ').trim();
  }

  it('usa a label padrao "Membro"', () => {
    fixture.detectChanges();
    expect(text()).toBe('Membro');
  });

  it('usa a label customizada quando informada', () => {
    fixture.componentRef.setInput('label', 'Voce participa');
    fixture.detectChanges();
    expect(text()).toBe('Voce participa');
  });

  it('cai para "Membro" quando a label recebida e so espaco em branco', () => {
    fixture.componentRef.setInput('label', '   ');
    fixture.detectChanges();
    expect(text()).toBe('Membro');
  });

  it('cai para "Membro" quando a label recebida e uma string vazia', () => {
    fixture.componentRef.setInput('label', '');
    fixture.detectChanges();
    expect(text()).toBe('Membro');
  });

  it('renderiza um icone <svg> inline usando currentColor', () => {
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('stroke')).toBe('currentColor');
  });

  describe('estados', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const botao = () => el().querySelector('button[uc-button]') as HTMLButtonElement | null;
    const definir = (estado: UcMemberIndicatorEstado) => {
      fixture.componentRef.setInput('estado', estado);
      fixture.detectChanges();
    };

    it('o estado padrao e membro: texto com icone check e sem botao', () => {
      fixture.componentRef.setInput('label', 'Você é membro');
      fixture.detectChanges();
      expect(text()).toBe('Você é membro');
      expect(el().querySelector('uc-icon')).not.toBeNull();
      expect(botao()).toBeNull();
    });

    it('nao-membro: botao secundario Participar que emite participar', () => {
      definir('nao-membro');
      const emitidos: unknown[] = [];
      fixture.componentInstance.participar.subscribe(() => emitidos.push(1));
      expect(botao()!.classList.contains('uc-button--secondary')).toBe(true);
      expect(botao()!.textContent!.trim()).toBe('Participar');
      botao()!.click();
      expect(emitidos.length).toBe(1);
    });

    it('entrando: botao aria-disabled "Entrando…" que nao emite e mantem o mesmo elemento', () => {
      definir('nao-membro');
      const antes = botao()!;
      antes.focus();
      definir('entrando');
      const emitidos: unknown[] = [];
      fixture.componentInstance.participar.subscribe(() => emitidos.push(1));
      expect(botao()).toBe(antes);
      expect(document.activeElement).toBe(antes);
      expect(antes.getAttribute('aria-disabled')).toBe('true');
      expect(antes.hasAttribute('disabled')).toBe(false);
      expect(antes.textContent!.trim()).toBe('Entrando…');
      antes.click();
      expect(emitidos.length).toBe(0);
    });

    it('restrito: texto sem botao', () => {
      definir('restrito');
      expect(text()).toBe('Só para alunos deste curso');
      expect(botao()).toBeNull();
    });

    describe('membro-menu', () => {
      beforeEach(() => {
        document.body.appendChild(el());
        definir('membro-menu');
      });
      afterEach(() => document.body.replaceChildren());

      it('botao Membro com aria-haspopup e aria-expanded', () => {
        expect(botao()!.textContent!.trim()).toBe('Membro');
        expect(botao()!.getAttribute('aria-haspopup')).toBe('menu');
        expect(botao()!.getAttribute('aria-expanded')).toBe('false');
        expect(el().querySelectorAll('button[uc-button] uc-icon').length).toBe(2);
      });

      it('abre e fecha ao clicar no botao', async () => {
        botao()!.click();
        fixture.detectChanges();
        expect(botao()!.getAttribute('aria-expanded')).toBe('true');
        expect(el().querySelector('[role="menu"]')).not.toBeNull();
        expect(el().querySelector('[role="menuitem"]')!.textContent!.trim()).toBe('Sair');
        botao()!.click();
        fixture.detectChanges();
        expect(el().querySelector('[role="menu"]')).toBeNull();
      });

      it('Sair emite sair e fecha o menu', () => {
        const emitidos: unknown[] = [];
        fixture.componentInstance.sair.subscribe(() => emitidos.push(1));
        botao()!.click();
        fixture.detectChanges();
        (el().querySelector('[role="menuitem"]') as HTMLElement).click();
        fixture.detectChanges();
        expect(emitidos.length).toBe(1);
        expect(el().querySelector('[role="menu"]')).toBeNull();
        expect(botao()!.getAttribute('aria-expanded')).toBe('false');
      });

      it('Escape devolve o foco ao botao', async () => {
        botao()!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        (el().querySelector('[role="menuitem"]') as HTMLElement).dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        );
        fixture.detectChanges();
        await fixture.whenStable();
        expect(el().querySelector('[role="menu"]')).toBeNull();
        expect(document.activeElement).toBe(botao());
      });
    });
  });
});

// jsdom cannot read computed styles from an external stylesheet; the green-ok /
// no-background half of the I/O matrix is pinned to the SCSS source (as Story
// 14.1's tokens.spec.ts does).
describe('member-indicator.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  // Strip comments before matching so a future prose reword of the header
  // comment (which mentions "background") cannot spuriously pass or fail this.
  const stripComments = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const norm = stripComments(readFileSync(join(dir, 'member-indicator.scss'), 'utf8')).replace(
    /\s+/g,
    ' ',
  );

  it('is wired to the component via styleUrl', () => {
    expect(readFileSync(join(dir, 'member-indicator.ts'), 'utf8')).toContain(
      "styleUrl: './member-indicator.scss'",
    );
  });

  it('is green-ok text with no background', () => {
    expect(norm).toContain('color: var(--uc-color-green-ok)');
    expect(norm).toContain('color: var(--uc-color-ink-soft)');
    expect(norm).not.toMatch(/(^|[ ;{])background(-color)?\s*:/);
  });
});
