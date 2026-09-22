import { TestBed } from '@angular/core/testing';
import { AdminModeracao } from './admin-moderacao';

describe('AdminModeracao', () => {
  it('mostra o título e os blocos como "Em breve" (nada inventado)', async () => {
    await TestBed.configureTestingModule({ imports: [AdminModeracao] }).compileComponents();
    const fixture = TestBed.createComponent(AdminModeracao);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Moderação');
    expect(el.querySelectorAll('.admin-pagina__em-breve').length).toBe(2);
  });
});
