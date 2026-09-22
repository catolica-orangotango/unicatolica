import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { API_BASE_URL } from '../../core/config/api.config';
import { AdminShell } from './admin-shell';

describe('AdminShell', () => {
  let fixture: ComponentFixture<AdminShell>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.setItem('pacext.token', 'token-fake');
    await TestBed.configureTestingModule({
      imports: [AdminShell],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminShell);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('identifica a área como Administração e tem um router-outlet pro conteúdo', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.admin-shell__selo')?.textContent).toContain('Administração');
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('a sidebar tem Dashboard geral, Central de relatórios e logs e Moderação, com os destinos certos', () => {
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('nav.admin-shell__sidebar a'),
    ) as HTMLAnchorElement[];

    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Dashboard geral',
      'Central de relatórios e logs',
      'Moderação',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/admin', '/admin/relatorios', '/admin/moderacao']);
  });

  it('Sair encerra a sessão e volta para /admin/login (não para o login do aluno)', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    (fixture.nativeElement.querySelector('.admin-shell__sair') as HTMLButtonElement).click();
    httpMock.expectOne(`${API_BASE_URL}/auth/logout`).flush(null);

    expect(localStorage.getItem('pacext.token')).toBeNull();
    expect(navegar).toHaveBeenCalledWith('/admin/login');
  });
});
