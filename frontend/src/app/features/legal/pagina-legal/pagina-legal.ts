import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DOCUMENTOS_LEGAIS, TipoDocumentoLegal, VERSAO_TEXTOS_LEGAIS } from '../textos-legais';

/**
 * Política de Privacidade e Termos de Uso (KAN-130, RNF05). Página pública: fica fora da casca
 * autenticada (app.routes.ts), então abre sem login. Uma rota por documento, escolhida por
 * `data.documento`; o texto vem de `textos-legais.ts`.
 */
@Component({
  selector: 'app-pagina-legal',
  imports: [RouterLink],
  templateUrl: './pagina-legal.html',
  styleUrl: './pagina-legal.scss',
})
export class PaginaLegal {
  private readonly rota = inject(ActivatedRoute);

  private readonly tipo = toSignal(
    this.rota.data.pipe(map((data) => (data['documento'] === 'termos' ? 'termos' : 'privacidade') as TipoDocumentoLegal)),
    { initialValue: 'privacidade' as TipoDocumentoLegal },
  );

  protected readonly documento = computed(() => DOCUMENTOS_LEGAIS[this.tipo()]);
  protected readonly outro = computed(() =>
    this.tipo() === 'privacidade'
      ? { caminho: '/termos', rotulo: 'Termos de Uso' }
      : { caminho: '/privacidade', rotulo: 'Política de Privacidade' },
  );
  protected readonly versao = VERSAO_TEXTOS_LEGAIS;
}
