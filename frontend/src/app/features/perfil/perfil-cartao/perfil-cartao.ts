import { Component, input } from '@angular/core';
import { UcCard } from '../../../ui';
import { iniciais } from '../../publicacoes/tempo-relativo';
import { Perfil } from '../perfil.service';

/**
 * Leitura do perfil acadêmico (RF20): nome, curso, período e interesses. Usado no próprio
 * perfil (Story 4.2) e no de outro usuário (Story 4.4, somente leitura, sem dado sensível).
 */
@Component({
  selector: 'app-perfil-cartao',
  imports: [UcCard],
  templateUrl: './perfil-cartao.html',
  styleUrl: './perfil-cartao.scss',
})
export class PerfilCartao {
  readonly perfil = input.required<Perfil>();

  protected readonly iniciais = iniciais;
}
