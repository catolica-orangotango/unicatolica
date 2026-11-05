import { Component, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ShellLateralService } from './shell-lateral.service';

@Component({ template: '<ng-template #t>lateral</ng-template>' })
class HostTemplate {
  readonly t = viewChild.required<TemplateRef<unknown>>('t');
}

describe('ShellLateralService', () => {
  it('começa sem template', () => {
    expect(TestBed.inject(ShellLateralService).template()).toBeNull();
  });

  it('definir() registra e limpa o template da coluna lateral', () => {
    const servico = TestBed.inject(ShellLateralService);
    const host = TestBed.createComponent(HostTemplate);
    host.detectChanges();

    servico.definir(host.componentInstance.t());
    expect(servico.template()).toBe(host.componentInstance.t());

    servico.definir(null);
    expect(servico.template()).toBeNull();
  });
});
