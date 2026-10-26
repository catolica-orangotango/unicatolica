import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PainelAdmin } from './painel-admin';

describe('PainelAdmin', () => {
  async function montar() {
    await TestBed.configureTestingModule({
      imports: [PainelAdmin],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(PainelAdmin);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra o título da área de administração', async () => {
    const el = await montar();

    expect(el.querySelector('h1')?.textContent).toContain('Administração');
  });

  it('tem o atalho para a tela de Cursos', async () => {
    const el = await montar();

    const link = el.querySelector('a[href="/admin/cursos"]');
    expect(link?.textContent?.trim()).toBe('Cursos');
  });
});
