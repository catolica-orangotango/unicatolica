import { Component } from '@angular/core';
import { UcCard } from '../../../ui';

/**
 * Página exclusiva de moderação do administrador. Só a estrutura por enquanto: não há
 * endpoint de denúncias no `openapi.yaml` (dependem do Epic 3), então os blocos aparecem
 * como "Em breve" — sem dado inventado.
 */
@Component({
  selector: 'app-admin-moderacao',
  imports: [UcCard],
  templateUrl: './admin-moderacao.html',
  styleUrl: './admin-moderacao.scss',
})
export class AdminModeracao {}
