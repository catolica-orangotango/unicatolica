import { TestBed } from '@angular/core/testing';
import { AdminRelatorios } from './admin-relatorios';

describe('AdminRelatorios', () => {
  it('mostra o título e os blocos como "Em breve" (nada inventado)', async () => {
    await TestBed.configureTestingModule({ imports: [AdminRelatorios] }).compileComponents();
    const fixture = TestBed.createComponent(AdminRelatorios);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Central de relatórios e logs');
    expect(el.querySelectorAll('.admin-pagina__em-breve').length).toBe(2);
  });
});
