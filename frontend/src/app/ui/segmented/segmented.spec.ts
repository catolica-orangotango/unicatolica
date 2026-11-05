import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UcSegmented, type UcSegmentedOpcao } from './segmented';

@Component({
  imports: [UcSegmented],
  template: `<uc-segmented rotulo="Filtro" [opcoes]="opcoes()" [(valor)]="valor" />`,
})
class HostComponent {
  readonly opcoes = signal<readonly UcSegmentedOpcao[]>([
    { valor: 'todos', rotulo: 'Todos', contador: 12 },
    { valor: 'abertos', rotulo: 'Abertos' },
    { valor: 'fechados', rotulo: 'Fechados' },
  ]);
  readonly valor = signal('todos');
}

describe('UcSegmented', () => {
  function criar(valor = 'todos') {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.valor.set(valor);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const radios = () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    return { fixture, host, radios };
  }

  function tecla(el: HTMLElement, key: string) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  }

  it('renderiza um radiogroup rotulado com um radio por opção', () => {
    const { host, radios } = criar();
    const grupo = host.querySelector('[role="radiogroup"]');
    expect(grupo?.getAttribute('aria-label')).toBe('Filtro');
    expect(radios()).toHaveLength(3);
    expect(radios()[0].type).toBe('button');
  });

  it('a opção do valor tem aria-checked e classe', () => {
    const { radios } = criar('abertos');
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(radios()[1].classList).toContain('uc-segmented__opcao--on');
    expect(radios()[0].classList).not.toContain('uc-segmented__opcao--on');
  });

  it('clicar seleciona e atualiza o valor', () => {
    const { fixture, radios } = criar();
    radios()[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.valor()).toBe('fechados');
    expect(radios()[2].getAttribute('aria-checked')).toBe('true');
  });

  it('setas movem a seleção e o foco, com wrap', () => {
    const { fixture, radios } = criar('todos');
    tecla(radios()[0], 'ArrowRight');
    fixture.detectChanges();
    expect(fixture.componentInstance.valor()).toBe('abertos');
    expect(document.activeElement).toBe(radios()[1]);
    tecla(radios()[1], 'ArrowDown');
    fixture.detectChanges();
    expect(fixture.componentInstance.valor()).toBe('fechados');
    tecla(radios()[2], 'ArrowRight');
    fixture.detectChanges();
    expect(fixture.componentInstance.valor()).toBe('todos');
    tecla(radios()[0], 'ArrowLeft');
    fixture.detectChanges();
    expect(fixture.componentInstance.valor()).toBe('fechados');
    tecla(radios()[2], 'ArrowUp');
    fixture.detectChanges();
    expect(fixture.componentInstance.valor()).toBe('abertos');
  });

  it('Home e End vão para a primeira e a última', () => {
    const { fixture, radios } = criar('abertos');
    tecla(radios()[1], 'End');
    fixture.detectChanges();
    expect(fixture.componentInstance.valor()).toBe('fechados');
    expect(document.activeElement).toBe(radios()[2]);
    tecla(radios()[2], 'Home');
    fixture.detectChanges();
    expect(fixture.componentInstance.valor()).toBe('todos');
  });

  it('roving tabindex: só a selecionada é focável', () => {
    const { radios } = criar('abertos');
    expect(radios().map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('se o valor não casa com nenhuma opção, a primeira é focável', () => {
    const { radios } = criar('inexistente');
    expect(radios().map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    expect(radios().every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  it('contador só aparece quando informado', () => {
    const { radios } = criar();
    expect(radios()[0].querySelector('.uc-segmented__contador')?.textContent?.trim()).toBe('12');
    expect(radios()[1].querySelector('.uc-segmented__contador')).toBeNull();
  });
});

describe('segmented.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const norm = readFileSync(join(dir, 'segmented.scss'), 'utf8').replace(/\s+/g, ' ');

  it('é ligado ao componente via styleUrl', () => {
    expect(readFileSync(join(dir, 'segmented.ts'), 'utf8')).toContain("styleUrl: './segmented.scss'");
  });

  it('trilho: fundo surface-strong e raio full', () => {
    expect(norm).toMatch(/\.uc-segmented \{[^}]*background: var\(--uc-color-surface-strong\)/);
    expect(norm).toMatch(/\.uc-segmented \{[^}]*border-radius: var\(--uc-radius-full\)/);
  });

  it('opção: ink-soft, fonte small medium, borda transparente', () => {
    expect(norm).toMatch(/\.uc-segmented__opcao \{[^}]*color: var\(--uc-color-ink-soft\)/);
    expect(norm).toMatch(/\.uc-segmented__opcao \{[^}]*font-size: var\(--uc-font-size-small\)/);
    expect(norm).toMatch(/\.uc-segmented__opcao \{[^}]*border: 1px solid transparent/);
  });

  it('selecionada: surface, ink, semibold, borda border-strong e sem sombra', () => {
    const m = /\.uc-segmented__opcao--on \{([^}]*)\}/.exec(norm);
    expect(m).not.toBeNull();
    const bloco = m![1];
    expect(bloco).toContain('background: var(--uc-color-surface)');
    expect(bloco).toContain('color: var(--uc-color-ink)');
    expect(bloco).toContain('font-weight: var(--uc-font-weight-semibold)');
    expect(bloco).toContain('border-color: var(--uc-color-border-strong)');
    expect(bloco).not.toContain('box-shadow');
  });

  it('contador: label, semibold, maroon', () => {
    expect(norm).toMatch(/\.uc-segmented__contador \{[^}]*color: var\(--uc-color-maroon\)/);
    expect(norm).toMatch(/\.uc-segmented__contador \{[^}]*font-size: var\(--uc-font-size-label\)/);
  });

  it('mobile: grupo 100%, opções flex 1 centradas, altura touch-target', () => {
    const m = /@media \(max-width: bp\.\$uc-bp-mobile\) \{(.*)\}\s*$/.exec(norm);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/\.uc-segmented \{[^}]*width: 100%/);
    expect(m![1]).toMatch(/\.uc-segmented__opcao \{[^}]*flex: 1/);
    expect(m![1]).toMatch(/\.uc-segmented__opcao \{[^}]*justify-content: center/);
    expect(m![1]).toMatch(/\.uc-segmented__opcao \{[^}]*height: var\(--uc-touch-target\)/);
  });
});
