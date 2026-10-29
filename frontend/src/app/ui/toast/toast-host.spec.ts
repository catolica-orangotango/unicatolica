import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TOAST_DURACAO_MS, ToastService } from './toast.service';
import { UcToastHost } from './toast-host';

describe('UcToastHost', () => {
  let fixture: ComponentFixture<UcToastHost>;
  let service: ToastService;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [UcToastHost] }).compileComponents();
    fixture = TestBed.createComponent(UcToastHost);
    service = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function wrapper(): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector('[role="status"]') as HTMLElement;
  }

  function itens(): HTMLElement[] {
    return [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('.uc-toast-host__item'),
    ] as HTMLElement[];
  }

  it('renderiza o wrapper live-region mesmo sem nenhum toast', () => {
    expect(wrapper()).not.toBeNull();
    expect(wrapper().getAttribute('aria-live')).toBe('polite');
    expect(wrapper().getAttribute('aria-atomic')).toBe('false');
    expect(itens()).toHaveLength(0);
  });

  it('renderiza um toast enfileirado com o icone de check e a mensagem', () => {
    service.mostrar('Você entrou em Atlética');
    fixture.detectChanges();

    expect(itens()).toHaveLength(1);
    expect(itens()[0].textContent?.trim()).toBe('Você entrou em Atlética');

    const svg = itens()[0].querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('stroke')).toBe('currentColor');
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
    expect(itens()[0].querySelector('uc-icon')).not.toBeNull();
    expect(itens()[0].querySelector('uc-icon')!.classList).toContain('uc-toast-host__icon--ok');
    expect(itens()[0].getAttribute('role')).toBeNull();
  });

  it('renderiza dois toasts simultaneos quando mostrar() e chamado duas vezes seguidas', () => {
    service.mostrar('Primeira mensagem');
    service.mostrar('Segunda mensagem');
    fixture.detectChanges();

    expect(itens().map((el) => el.textContent?.trim())).toEqual([
      'Primeira mensagem',
      'Segunda mensagem',
    ]);
  });

  it('mostrar("") nao renderiza nenhum item', () => {
    service.mostrar('   ');
    fixture.detectChanges();

    expect(itens()).toHaveLength(0);
  });

  it('remove o item renderizado quando o servico o descarta apos TOAST_DURACAO_MS', () => {
    service.mostrar('Você entrou em Atlética');
    fixture.detectChanges();
    expect(itens()).toHaveLength(1);

    vi.advanceTimersByTime(TOAST_DURACAO_MS);
    fixture.detectChanges();

    expect(itens()).toHaveLength(0);
  });

  it('toast de erro tem role alert no proprio item e icone de alerta', () => {
    service.mostrar('Falhou', { tipo: 'erro' });
    fixture.detectChanges();

    expect(itens()[0].getAttribute('role')).toBe('alert');
    const icone = itens()[0].querySelector('uc-icon') as HTMLElement;
    expect(icone.classList).toContain('uc-toast-host__icon--erro');
    // o check tem 1 path de 'm5 12.5'; o alert tem circle
    expect(itens()[0].querySelector('svg circle')).not.toBeNull();
  });

  it('sem acao nao renderiza botao', () => {
    service.mostrar('ok');
    fixture.detectChanges();
    expect(itens()[0].querySelector('button')).toBeNull();
  });

  it('clicar na acao chama aoAcionar e dispensa o toast', () => {
    const aoAcionar = vi.fn();
    service.mostrar('Removido', { acao: { rotulo: 'Desfazer', aoAcionar } });
    fixture.detectChanges();

    const botao = itens()[0].querySelector('button') as HTMLButtonElement;
    expect(botao.type).toBe('button');
    expect(botao.textContent?.trim()).toBe('Desfazer');
    botao.click();
    fixture.detectChanges();

    expect(aoAcionar).toHaveBeenCalledTimes(1);
    expect(itens()).toHaveLength(0);
  });

  describe('foco', () => {
    let origem: HTMLButtonElement;

    beforeEach(() => {
      origem = document.createElement('button');
      document.body.appendChild(origem);
      origem.focus();
    });

    afterEach(() => {
      document.body.querySelectorAll('main').forEach((m) => m.remove());
      origem.remove();
    });

    function mostrarComAcao(): HTMLButtonElement {
      service.mostrar('Removido', { acao: { rotulo: 'Desfazer', aoAcionar: () => undefined } });
      fixture.detectChanges();
      return itens()[0].querySelector('button') as HTMLButtonElement;
    }

    it('com foco dentro, o toast nao some apos TOAST_DURACAO_MS', () => {
      const botao = mostrarComAcao();
      document.body.appendChild(fixture.nativeElement);
      botao.focus();
      botao.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      vi.advanceTimersByTime(TOAST_DURACAO_MS * 2);
      fixture.detectChanges();
      expect(itens()).toHaveLength(1);
    });

    it('some depois que o foco sai, apos uma nova duracao', () => {
      const botao = mostrarComAcao();
      document.body.appendChild(fixture.nativeElement);
      botao.focus();
      botao.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      vi.advanceTimersByTime(TOAST_DURACAO_MS * 2);

      botao.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }),
      );
      vi.advanceTimersByTime(TOAST_DURACAO_MS - 1);
      fixture.detectChanges();
      expect(itens()).toHaveLength(1);

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(itens()).toHaveLength(0);
    });

    it('focusout para dentro do mesmo toast nao retoma o timer', () => {
      const botao = mostrarComAcao();
      botao.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      botao.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: itens()[0] }),
      );
      vi.advanceTimersByTime(TOAST_DURACAO_MS * 2);
      expect(service.toasts()).toHaveLength(1);
    });

    it('ao dispensar com o foco dentro, devolve o foco a origem', () => {
      const botao = mostrarComAcao();
      document.body.appendChild(fixture.nativeElement);
      botao.focus();
      expect(document.activeElement).toBe(botao);

      botao.click();
      fixture.detectChanges();

      expect(document.activeElement).toBe(origem);
    });

    it('se a origem saiu do DOM, o foco vai para o main da pagina', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);
      const botao = mostrarComAcao();
      document.body.appendChild(fixture.nativeElement);
      origem.remove();
      botao.focus();

      botao.click();
      fixture.detectChanges();

      expect(document.activeElement).toBe(main);
    });

    it('sem origem nem main, o foco fica como estava', () => {
      const botao = mostrarComAcao();
      document.body.appendChild(fixture.nativeElement);
      origem.remove();
      botao.focus();
      botao.click();
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('nao mexe no foco quando ele nao estava dentro do toast', () => {
      mostrarComAcao();
      document.body.appendChild(fixture.nativeElement);
      origem.focus();
      vi.advanceTimersByTime(TOAST_DURACAO_MS);
      fixture.detectChanges();
      expect(document.activeElement).toBe(origem);
    });
  });
});

// jsdom cannot read computed styles from an external stylesheet; the fixed
// bottom-right position / card surface / motion half of the I/O matrix is
// pinned to the SCSS source (as Story 14.1's tokens.spec.ts does).
describe('toast-host.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const stripComments = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const norm = stripComments(readFileSync(join(dir, 'toast-host.scss'), 'utf8')).replace(
    /\s+/g,
    ' ',
  );

  it('is wired to the component via styleUrl', () => {
    expect(readFileSync(join(dir, 'toast-host.ts'), 'utf8')).toContain(
      "styleUrl: './toast-host.scss'",
    );
  });

  it('is fixed-positioned bottom-right using the page-margin token', () => {
    expect(norm).toContain('position: fixed');
    expect(norm).toContain('right: var(--uc-space-page-margin)');
    expect(norm).toContain('bottom: var(--uc-space-page-margin)');
  });

  it('e uma superficie escura com raio lg e a sombra de toast', () => {
    expect(norm).toContain('background: var(--uc-color-ink)');
    expect(norm).toContain('color: var(--uc-color-surface)');
    expect(norm).toContain('border-radius: var(--uc-radius-lg)');
    expect(norm).toContain('box-shadow: var(--uc-shadow-toast)');
    expect(norm).not.toContain('var(--uc-color-border)');
  });

  it('usa toast-ok e toast-error nos icones e ink-nav no botao de acao', () => {
    expect(norm).toContain('color: var(--uc-color-toast-ok)');
    expect(norm).toContain('color: var(--uc-color-toast-error)');
    expect(norm).toContain('background: var(--uc-color-ink-nav)');
  });

  it('abaixo do breakpoint mobile ocupa a largura e sobe acima da barra de abas', () => {
    expect(norm).toContain('@media (max-width: bp.$uc-bp-mobile)');
    expect(norm).toContain(
      'bottom: calc(var(--uc-space-unit) * 16 + var(--uc-space-page-margin))',
    );
    expect(norm).toContain('left: var(--uc-space-page-margin)');
  });

  it('has an entrance-only fade/slide keyframes at 150ms with a reduced-motion guard', () => {
    expect(norm).toMatch(/@keyframes [a-z-]+\s*\{\s*from\s*\{\s*opacity:\s*0/);
    expect(norm).toMatch(/animation:\s*[a-z-]+\s*150ms\s*ease-out/);
    expect(norm).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*animation:\s*none/);
  });
});
