import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Denuncia } from '../moderacao.service';
import { AnaliseDenuncia } from './analise-denuncia';

function denuncia(parcial: Partial<Denuncia> = {}, situacaoConteudo: 'VISIVEL' | 'OCULTO' = 'VISIVEL'): Denuncia {
  return {
    id: 2201,
    conteudo: {
      tipo: 'PUBLICACAO',
      id: 7,
      texto: 'Texto denunciado',
      autor: { id: 50, nome: 'Bruno Kramer', curso: null },
      comunidadeId: 27,
      criadoEm: new Date().toISOString(),
      situacao: situacaoConteudo,
    },
    motivo: 'Discurso ofensivo',
    situacao: 'PENDENTE',
    criadoEm: new Date().toISOString(),
    resolvidaEm: null,
    ...parcial,
  };
}

describe('AnaliseDenuncia', () => {
  let fixture: ComponentFixture<AnaliseDenuncia>;
  let el: HTMLElement;
  let ocultados: string[];
  let descartados: (string | undefined)[];
  let restaurados: number;

  async function montar(d: Denuncia): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AnaliseDenuncia],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(AnaliseDenuncia);
    fixture.componentRef.setInput('denuncia', d);
    ocultados = [];
    descartados = [];
    restaurados = 0;
    fixture.componentInstance.ocultar.subscribe((m) => ocultados.push(m));
    fixture.componentInstance.descartar.subscribe((m) => descartados.push(m));
    fixture.componentInstance.restaurar.subscribe(() => restaurados++);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  function botao(texto: string): HTMLButtonElement {
    return [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto) as HTMLButtonElement;
  }

  function digitar(texto: string): void {
    const campo = el.querySelector('textarea') as HTMLTextAreaElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('mostra conteúdo, autor e motivo, com o aviso de anonimato e sem dado do denunciante (RF77.1)', async () => {
    await montar(denuncia());

    expect(el.textContent).toContain('Denúncia #2201');
    expect(el.textContent).toContain('A identidade de quem denunciou não é compartilhada com você.');
    expect(el.textContent).toContain('Texto denunciado');
    expect(el.textContent).toContain('Discurso ofensivo');
    expect(el.querySelector('a.analise__autor')?.getAttribute('href')).toBe('/usuarios/50');
    expect(el.textContent?.toLowerCase()).not.toContain('denunciado por');
  });

  it('ocultar exige motivo e emite o motivo sem espaços', async () => {
    await montar(denuncia());

    expect(botao('Ocultar postagem').disabled).toBe(true);
    digitar('   ');
    expect(botao('Ocultar postagem').disabled).toBe(true);

    digitar('  Conteúdo ofensivo.  ');
    botao('Ocultar postagem').click();

    expect(ocultados).toEqual(['Conteúdo ofensivo.']);
  });

  it('descartar funciona sem motivo e com motivo', async () => {
    await montar(denuncia());

    botao('Descartar denúncia').click();
    digitar('improcedente');
    botao('Descartar denúncia').click();

    expect(descartados).toEqual([undefined, 'improcedente']);
  });

  it('motivo acima de 1000 caracteres bloqueia as duas ações', async () => {
    await montar(denuncia());

    digitar('a'.repeat(1001));

    expect(botao('Ocultar postagem').disabled).toBe(true);
    expect(botao('Descartar denúncia').disabled).toBe(true);
  });

  it('postagem oculta: esmaecida, selo "Oculta" e só "Restaurar"', async () => {
    await montar(denuncia({ situacao: 'RESOLVIDA', resolvidaEm: new Date().toISOString() }, 'OCULTO'));

    expect(el.querySelector('.analise__conteudo--oculto')).toBeTruthy();
    expect(el.querySelector('.analise__selo')?.textContent?.trim()).toBe('Oculta');
    expect(el.querySelector('textarea')).toBeNull();
    expect(botao('Ocultar postagem')).toBeUndefined();

    botao('Restaurar postagem').click();
    expect(restaurados).toBe(1);
  });

  it('descartada: só informa o desfecho, sem ações', async () => {
    await montar(denuncia({ situacao: 'DESCARTADA', resolvidaEm: new Date().toISOString() }));

    expect(el.querySelectorAll('button').length).toBe(0);
    expect(el.textContent).toContain('Denúncia descartada');
  });

  it('enviando desabilita as ações e o erro aparece como alerta', async () => {
    await montar(denuncia());
    digitar('ofensivo');
    fixture.componentRef.setInput('enviando', true);
    fixture.componentRef.setInput('erro', 'Esta denúncia já foi analisada.');
    fixture.detectChanges();

    expect(botao('Enviando…').disabled).toBe(true);
    expect(botao('Descartar denúncia').disabled).toBe(true);
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Esta denúncia já foi analisada.');
  });

  it('trocar de denúncia limpa o rascunho do motivo', async () => {
    await montar(denuncia());
    digitar('rascunho');

    fixture.componentRef.setInput('denuncia', denuncia({ id: 2202 }));
    fixture.detectChanges();
    // ngModel escreve no <textarea> numa microtask.
    await fixture.whenStable();
    fixture.detectChanges();

    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
  });
});
