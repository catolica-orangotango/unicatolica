import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import * as sass from 'sass';
import { UcIcon } from '../icon/icon';
import { UcField } from './field';
import { UcInput } from './input';

@Component({
  imports: [UcField, UcInput],
  template: `<uc-field label="E-mail institucional" [hint]="hint()" [error]="erro()">
    <input ucInput type="email" />
  </uc-field>`,
})
class CampoComponent {
  readonly hint = signal<string | undefined>(undefined);
  readonly erro = signal<string | null>(null);
}

@Component({
  imports: [UcField, UcInput],
  template: `<uc-field label="Curso">
    <select ucInput>
      <option value="es" selected>Engenharia de Software</option>
    </select>
  </uc-field>`,
})
class SelecaoComponent {}

@Component({
  imports: [UcInput],
  template: `<input ucInput id="proprio" />`,
})
class SoltoComponent {}

const dir = dirname(fileURLToPath(import.meta.url));
const css = sass
  .compile(join(dir, '_input.scss'), { style: 'expanded' })
  .css.replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/,\s+/g, ', ');

/** Declarações da primeira regra cujo seletor é exatamente o informado. */
function regra(seletor: string): Record<string, string> {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`(^|})\\s*${escapado}\\s*{([^}]*)}`).exec(css);
  expect(m, `regra ${seletor} ausente`).not.toBeNull();
  const out: Record<string, string> = {};
  for (const d of m![2].split(';').map((x) => x.trim()).filter(Boolean)) {
    const i = d.indexOf(':');
    out[d.slice(0, i).trim()] = d.slice(i + 1).trim();
  }
  return out;
}

describe('estilo do controle (_input.scss)', () => {
  it('repouso: borda border-input, raio md, altura touch-target', () => {
    const r = regra('.uc-input');
    expect(r['border']).toBe('1px solid var(--uc-color-border-input)');
    expect(r['border-radius']).toBe('var(--uc-radius-md)');
    expect(r['height']).toBe('var(--uc-touch-target)');
    expect(r['background']).toBe('var(--uc-color-surface)');
  });

  it('placeholder usa ink-faint', () => {
    expect(regra('.uc-input::placeholder')['color']).toBe('var(--uc-color-ink-faint)');
  });

  it('foco: borda maroon e halo de 3px maroon-tint', () => {
    const r = regra('.uc-input:focus, .uc-input:focus-visible');
    expect(r['border-color']).toBe('var(--uc-color-maroon)');
    expect(r['box-shadow']).toBe('0 0 0 3px var(--uc-color-maroon-tint)');
  });

  it('erro: borda error e halo de 3px error-tint', () => {
    const r = regra('.uc-input[aria-invalid=true], .uc-input.uc-input--erro');
    expect(r['border-color']).toBe('var(--uc-color-error)');
    expect(r['box-shadow']).toBe('0 0 0 3px var(--uc-color-error-tint)');
  });

  it('textarea: altura mínima e respiro vertical', () => {
    const r = regra('.uc-input:is(textarea)');
    expect(r['height']).toBe('auto');
    expect(r['min-height']).toBe('calc(var(--uc-space-unit) * 24)');
    expect(r['line-height']).toBe('var(--uc-line-height-body)');
  });
});

describe('UcField + UcInput', () => {
  function criar() {
    const fixture = TestBed.createComponent(CampoComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, input: el.querySelector('input')!, label: el.querySelector('label')! };
  }

  it('repouso: classe uc-input, sem aria-invalid nem aria-describedby', () => {
    const { input } = criar();
    expect(input.classList).toContain('uc-input');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('liga o label ao controle por for/id', () => {
    const { input, label } = criar();
    expect(label.textContent).toContain('E-mail institucional');
    expect(input.id).toMatch(/^uc-field-\d+$/);
    expect(label.getAttribute('for')).toBe(input.id);
  });

  it('cada campo recebe um id próprio', () => {
    const a = criar();
    const b = criar();
    expect(a.input.id).not.toBe(b.input.id);
  });

  it('dica: aparece e é referenciada por aria-describedby', () => {
    const { fixture, el, input } = criar();
    fixture.componentInstance.hint.set('Use o e-mail da CatólicaSC.');
    fixture.detectChanges();
    const dica = el.querySelector(`#${input.id}-dica`)!;
    expect(dica.textContent).toContain('Use o e-mail da CatólicaSC.');
    expect(input.getAttribute('aria-describedby')).toBe(`${input.id}-dica`);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('erro: aria-invalid, mensagem com ícone alert e texto, sem role alert', () => {
    const { fixture, el, input } = criar();
    fixture.componentInstance.erro.set('Use o e-mail institucional.');
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const msg = el.querySelector(`#${input.id}-erro`) as HTMLElement;
    expect(input.getAttribute('aria-describedby')).toBe(`${input.id}-erro`);
    expect(msg.textContent).toContain('Use o e-mail institucional.');
    expect(msg.hasAttribute('role')).toBe(false);
    const icone = fixture.debugElement.query(By.directive(UcIcon)).componentInstance as UcIcon;
    expect(icone.name()).toBe('alert');
    expect(icone.size()).toBe('sm');
  });

  it('dica e erro juntos: describedby lista os dois ids', () => {
    const { fixture, input } = criar();
    fixture.componentInstance.hint.set('Dica');
    fixture.componentInstance.erro.set('Erro');
    fixture.detectChanges();
    expect(input.getAttribute('aria-describedby')).toBe(`${input.id}-dica ${input.id}-erro`);
  });

  it('limpar o erro remove aria-invalid', () => {
    const { fixture, input } = criar();
    fixture.componentInstance.erro.set('Erro');
    fixture.detectChanges();
    fixture.componentInstance.erro.set(null);
    fixture.detectChanges();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('seleção: select recebe a classe e o id do campo', () => {
    const fixture = TestBed.createComponent(SelecaoComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const select = el.querySelector('select')!;
    expect(select.classList).toContain('uc-input');
    expect(el.querySelector('label')!.getAttribute('for')).toBe(select.id);
  });

  it('UcInput sem UcField não lança e só aplica a classe', () => {
    const fixture = TestBed.createComponent(SoltoComponent);
    expect(() => fixture.detectChanges()).not.toThrow();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    expect(input.classList).toContain('uc-input');
    expect(input.id).toBe('proprio');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });
});
