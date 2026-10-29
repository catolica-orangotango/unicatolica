import { Injectable, TemplateRef, signal } from '@angular/core';

/**
 * Coluna lateral da casca (KAN-91). Uma tela registra o conteúdo complementar
 * (agenda, descoberta, ...) com {@link definir} e limpa com `definir(null)` ao
 * sair; a casca só cria o `<aside>` enquanto houver template registrado.
 */
@Injectable({ providedIn: 'root' })
export class ShellLateralService {
  readonly template = signal<TemplateRef<unknown> | null>(null);

  definir(t: TemplateRef<unknown> | null): void {
    this.template.set(t);
  }
}
