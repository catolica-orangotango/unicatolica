import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UcIcon, type UcIconName } from './icon';

const NOMES: UcIconName[] = [
  'home', 'users', 'bell', 'user', 'search', 'dots', 'flag', 'eyeoff', 'check',
  'x', 'alert', 'info', 'down', 'trash', 'plus', 'lock', 'shield', 'edit',
];

@Component({
  imports: [UcIcon],
  template: `<uc-icon [name]="nome()" [size]="tamanho()" />`,
})
class HostComponent {
  readonly nome = signal<UcIconName>('home');
  readonly tamanho = signal<'md' | 'sm'>('md');
}

describe('UcIcon', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  const svg = () => fixture.nativeElement.querySelector('svg') as SVGElement;

  for (const nome of NOMES) {
    it(`renderiza o svg decorativo de "${nome}"`, () => {
      host.nome.set(nome);
      fixture.detectChanges();
      const el = svg();
      expect(el.getAttribute('aria-hidden')).toBe('true');
      expect(el.getAttribute('fill')).toBe('none');
      expect(el.getAttribute('stroke')).toBe('currentColor');
      expect(el.getAttribute('stroke-width')).toBe('1.75');
      expect(el.querySelectorAll('path, circle, rect').length).toBeGreaterThan(0);
    });
  }

  it('size="sm" adiciona uc-icon--sm; md não', () => {
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('uc-icon') as HTMLElement;
    expect(icon.classList.contains('uc-icon--sm')).toBe(false);
    host.tamanho.set('sm');
    fixture.detectChanges();
    expect(icon.classList.contains('uc-icon--sm')).toBe(true);
  });

  it('o caminho do check é o da folha de componentes', () => {
    host.nome.set('check');
    fixture.detectChanges();
    expect(svg().querySelector('path')?.getAttribute('d')).toBe('m5 12.5 4.5 4.5L19 7.5');
  });
});
