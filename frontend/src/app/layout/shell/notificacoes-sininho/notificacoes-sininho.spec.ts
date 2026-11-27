import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificacoesSininho } from './notificacoes-sininho';

@Component({
  imports: [NotificacoesSininho],
  template: `<app-notificacoes-sininho
    [totalNaoLidas]="totalNaoLidas()"
    [aberta]="aberta()"
    (alternou)="cliques = cliques + 1"
  />`,
})
class Host {
  readonly sininho = viewChild.required(NotificacoesSininho);
  readonly totalNaoLidas = signal(0);
  readonly aberta = signal(false);
  cliques = 0;
}

describe('NotificacoesSininho (Story 10.2, RN16/RN17)', () => {
  let f: ComponentFixture<Host>;

  beforeEach(() => {
    f = TestBed.createComponent(Host);
    document.body.appendChild(f.nativeElement);
    f.detectChanges();
  });

  afterEach(() => f.nativeElement.remove());

  const botao = (): HTMLButtonElement => f.nativeElement.querySelector('.sininho');

  it('sem não lidas: sem badge e aria-label só "Notificações"', () => {
    expect(botao().querySelector('.sininho__badge')).toBeNull();
    expect(botao().getAttribute('aria-label')).toBe('Notificações');
  });

  it('com 1 não lida: singular no aria-label e badge com o número', () => {
    f.componentInstance.totalNaoLidas.set(1);
    f.detectChanges();

    expect(botao().querySelector('.sininho__badge')?.textContent?.trim()).toBe('1');
    expect(botao().getAttribute('aria-label')).toBe('Notificações, 1 não lida');
  });

  it('com mais de 1: plural no aria-label', () => {
    f.componentInstance.totalNaoLidas.set(5);
    f.detectChanges();

    expect(botao().getAttribute('aria-label')).toBe('Notificações, 5 não lidas');
  });

  it('acima de 99: badge mostra "99+", mas o aria-label mantém o número exato', () => {
    f.componentInstance.totalNaoLidas.set(142);
    f.detectChanges();

    expect(botao().querySelector('.sininho__badge')?.textContent?.trim()).toBe('99+');
    expect(botao().getAttribute('aria-label')).toBe('Notificações, 142 não lidas');
  });

  it('aria-expanded reflete aberta(), e o ícone/badge são aria-hidden', () => {
    expect(botao().getAttribute('aria-expanded')).toBe('false');
    f.componentInstance.aberta.set(true);
    f.detectChanges();
    expect(botao().getAttribute('aria-expanded')).toBe('true');

    f.componentInstance.totalNaoLidas.set(2);
    f.detectChanges();
    expect(botao().querySelector('uc-icon svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(botao().querySelector('.sininho__badge')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('clicar emite alternou', () => {
    botao().click();
    expect(f.componentInstance.cliques).toBe(1);
  });

  it('focar() move o foco para o botão', () => {
    f.componentInstance.sininho().focar();
    expect(document.activeElement).toBe(botao());
  });
});
