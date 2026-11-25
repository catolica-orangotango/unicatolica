import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AdminLayout } from './admin-layout';

@Component({ template: '<h1>Tela filha</h1>' })
class Filha {}

describe('AdminLayout', () => {
  async function abrir(url: string): Promise<{ el: HTMLElement; router: Router }> {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'admin',
            component: AdminLayout,
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'cursos' },
              { path: 'cursos', component: Filha },
              { path: 'usuarios', component: Filha },
              { path: 'auditoria', component: Filha },
            ],
          },
        ]),
      ],
    }).compileComponents();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    harness.detectChanges();
    return { el: harness.routeNativeElement as HTMLElement, router: TestBed.inject(Router) };
  }

  it('/admin abre na aba Cursos', async () => {
    const { router } = await abrir('/admin');

    expect(router.url).toBe('/admin/cursos');
  });

  it('mostra as três abas, na ordem, e marca só a atual com aria-current', async () => {
    const { el } = await abrir('/admin/usuarios');

    const abas = [...el.querySelectorAll('nav[aria-label="Áreas de administração"] a')];
    expect(abas.map((a) => a.textContent?.trim())).toEqual(['Cursos', 'Usuários', 'Logs de auditoria']);
    expect(abas.map((a) => a.getAttribute('aria-current'))).toEqual([null, 'page', null]);
    expect(abas.map((a) => a.getAttribute('href'))).toEqual(['/admin/cursos', '/admin/usuarios', '/admin/auditoria']);
  });

  it('renderiza a tela filha abaixo das abas', async () => {
    const { el } = await abrir('/admin/auditoria');

    expect(el.querySelector('h1')?.textContent).toBe('Tela filha');
  });
});
