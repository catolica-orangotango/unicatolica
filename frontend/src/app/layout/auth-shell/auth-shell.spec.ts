import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UcAuthShell } from './auth-shell';

@Component({
  imports: [UcAuthShell],
  template: `<uc-auth-shell>
    <h1>Entrar</h1>
    <p>conteúdo projetado</p>
  </uc-auth-shell>`,
})
class Hospedeiro {}

describe('UcAuthShell', () => {
  let fixture: ComponentFixture<Hospedeiro>;
  let elemento: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Hospedeiro], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    elemento = fixture.nativeElement as HTMLElement;
  });

  it('renderiza exatamente um landmark <main>', () => {
    expect(elemento.querySelectorAll('main')).toHaveLength(1);
  });

  it('renderiza a marca: traço decorativo + nome da instituição', () => {
    const traco = elemento.querySelector('.auth-shell__marca-traco');
    expect(traco).toBeTruthy();
    // Traço é puramente visual: não pode ser anunciado por leitor de tela.
    expect(traco?.getAttribute('aria-hidden')).toBe('true');
    expect(elemento.querySelector('.auth-shell__marca-nome')?.textContent).toBe('UniCatólica');
  });

  it('projeta o <h1> e o conteúdo da tela dentro do card', () => {
    const card = elemento.querySelector('.auth-shell__card');
    expect(card?.querySelector('h1')?.textContent).toBe('Entrar');
    expect(card?.textContent).toContain('conteúdo projetado');
  });

  it('não declara nenhum heading próprio (o <h1> é sempre da tela consumidora)', () => {
    const shellTemplate = elemento.querySelector('.auth-shell__marca')!;
    expect(shellTemplate.querySelector('h1, h2, h3')).toBeNull();
  });

  it('mostra no rodapé os links da Política de Privacidade e dos Termos de Uso (KAN-130)', () => {
    const links = Array.from(elemento.querySelectorAll('nav[aria-label="Informações legais"] a'));
    expect(links.map((a) => a.textContent)).toEqual(['Privacidade', 'Termos de uso']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/privacidade', '/termos']);
  });
});
