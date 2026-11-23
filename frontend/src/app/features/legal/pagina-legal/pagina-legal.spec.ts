import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PaginaLegal } from './pagina-legal';
import { DOCUMENTOS_LEGAIS, VERSAO_TEXTOS_LEGAIS } from '../textos-legais';

describe('PaginaLegal', () => {
  async function abrir(documento: 'privacidade' | 'termos'): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'privacidade', data: { documento: 'privacidade' }, component: PaginaLegal },
          { path: 'termos', data: { documento: 'termos' }, component: PaginaLegal },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/${documento}`);
    return harness.routeNativeElement as HTMLElement;
  }

  it('/privacidade mostra a Política de Privacidade, as seções e a versão do texto', async () => {
    const el = await abrir('privacidade');

    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(el.querySelector('h1')?.textContent).toBe('Política de Privacidade');
    expect(el.querySelectorAll('h2')).toHaveLength(DOCUMENTOS_LEGAIS.privacidade.secoes.length);
    expect(el.textContent).toContain(`Versão ${VERSAO_TEXTOS_LEGAIS}`);
  });

  it('cobre o conteúdo mínimo da LGPD: finalidade, dados, anonimato, retenção e direitos', async () => {
    const titulos = Array.from((await abrir('privacidade')).querySelectorAll('h2')).map((h) => h.textContent);

    expect(titulos).toEqual(
      expect.arrayContaining([
        'Para que usamos os dados',
        'Quais dados coletamos',
        'Anonimato em enquetes e denúncias',
        'Por quanto tempo guardamos',
        'Seus direitos',
      ]),
    );
  });

  it('/termos mostra os Termos de Uso e linka a Política de Privacidade', async () => {
    const el = await abrir('termos');

    expect(el.querySelector('h1')?.textContent).toBe('Termos de Uso');
    expect(el.querySelector('.legal__outro a')?.getAttribute('href')).toBe('/privacidade');
  });

  it('tem um único landmark <main> e um link para voltar', async () => {
    const el = await abrir('privacidade');

    expect(el.querySelectorAll('main')).toHaveLength(1);
    expect(el.querySelector('.legal__voltar')?.getAttribute('href')).toBe('/login');
  });
});
