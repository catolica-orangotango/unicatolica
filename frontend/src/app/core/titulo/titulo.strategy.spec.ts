import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NOME_APP, TituloStrategy } from './titulo.strategy';

@Component({ template: '' })
class Tela {}

describe('TituloStrategy', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'com-titulo', title: 'Meu perfil', component: Tela },
          { path: 'sem-titulo', component: Tela },
        ]),
        { provide: TitleStrategy, useClass: TituloStrategy },
      ],
    });
  });

  it('põe o nome da tela antes do nome do app', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/com-titulo');

    expect(TestBed.inject(Title).getTitle()).toBe(`Meu perfil — ${NOME_APP}`);
  });

  it('rota sem título usa só o nome do app', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/sem-titulo');

    expect(TestBed.inject(Title).getTitle()).toBe(NOME_APP);
  });
});
