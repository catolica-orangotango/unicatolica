import { TestBed } from '@angular/core/testing';
import { PainelAdmin } from './painel-admin';

describe('PainelAdmin', () => {
  it('mostra o título da área de administração', async () => {
    await TestBed.configureTestingModule({ imports: [PainelAdmin] }).compileComponents();
    const fixture = TestBed.createComponent(PainelAdmin);
    fixture.detectChanges();

    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent).toContain('Administração');
  });
});
