import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PainelAdmin } from './painel-admin';

describe('PainelAdmin', () => {
  it('mostra o título da área de administração', async () => {
    await TestBed.configureTestingModule({ imports: [PainelAdmin], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(PainelAdmin);
    fixture.detectChanges();

    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent).toContain('Administração');
  });

  it('oferece o atalho para a tela de usuários', async () => {
    await TestBed.configureTestingModule({ imports: [PainelAdmin], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(PainelAdmin);
    fixture.detectChanges();

    const atalho = (fixture.nativeElement as HTMLElement).querySelector('a[href="/admin/usuarios"]');
    expect(atalho?.textContent?.trim()).toBe('Usuários');
  });
});
