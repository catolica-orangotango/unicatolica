import { Component, ElementRef, effect, inject } from '@angular/core';
import { UcIcon } from '../icon/icon';
import { ToastItem, ToastService } from './toast.service';

/**
 * Toast escuro do redesign (KAN-91), montado uma vez em `app.html`.
 *
 * Lê `ToastService.toasts()` e renderiza cada item. Foco: `focusin` dentro do
 * toast pausa o timer, `focusout` para fora dele o reinicia. Quando um toast
 * com o foco dentro é removido, o foco volta ao elemento de origem (se ainda
 * estiver no DOM) ou ao `main` da página.
 */
@Component({
  selector: 'uc-toast-host',
  imports: [UcIcon],
  templateUrl: './toast-host.html',
  styleUrl: './toast-host.scss',
})
export class UcToastHost {
  protected readonly service = inject(ToastService);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  #anteriores: readonly ToastItem[] = [];

  constructor() {
    // Roda antes da atualização do template: o item removido ainda está no
    // DOM, então dá para saber se o foco estava dentro dele e movê-lo antes.
    effect(() => {
      const atuais = this.service.toasts();
      for (const antigo of this.#anteriores) {
        if (!atuais.some((item) => item.id === antigo.id)) {
          this.#restaurarFoco(antigo);
        }
      }
      this.#anteriores = atuais;
    });
  }

  protected aoSairDoFoco(evento: FocusEvent, id: number): void {
    const item = evento.currentTarget as HTMLElement;
    if (evento.relatedTarget instanceof Node && item.contains(evento.relatedTarget)) {
      return;
    }
    this.service.retomar(id);
  }

  protected acionar(toast: ToastItem): void {
    toast.acao?.aoAcionar();
    this.service.dispensar(toast.id);
  }

  #restaurarFoco(toast: ToastItem): void {
    const ativo = document.activeElement;
    const elemento = this.#host.nativeElement.querySelector(`[data-toast-id="${toast.id}"]`);
    if (!elemento || !ativo || !elemento.contains(ativo)) {
      return;
    }
    if (toast.origem?.isConnected) {
      toast.origem.focus();
      return;
    }
    const main = document.querySelector<HTMLElement>('main');
    if (main) {
      if (!main.hasAttribute('tabindex')) {
        main.setAttribute('tabindex', '-1');
      }
      main.focus();
    }
  }
}
