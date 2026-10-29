import { Component } from '@angular/core';

/**
 * Esqueleto de carregamento (KAN-91). Sem inputs: é uma barra decorativa
 * (`aria-hidden="true"`) com gradiente estático, sem animação. A largura vem do
 * CSS do consumidor (padrão: 100%).
 *
 * Acessibilidade: o contêiner que guarda os esqueletos deve receber
 * `aria-busy="true"` enquanto o conteúdo real carrega.
 */
@Component({
  selector: 'uc-skeleton',
  template: '',
  styleUrl: './skeleton.scss',
  host: { 'aria-hidden': 'true' },
})
export class UcSkeleton {}
