import { Component } from '@angular/core';
import { UcCard } from '../../../ui';

/**
 * Central de relatórios e logs do administrador. Só a estrutura por enquanto: nenhum
 * endpoint de relatório ou de auditoria existe no `openapi.yaml`, então os blocos aparecem
 * como "Em breve" — sem dado inventado.
 */
@Component({
  selector: 'app-admin-relatorios',
  imports: [UcCard],
  templateUrl: './admin-relatorios.html',
  styleUrl: './admin-relatorios.scss',
})
export class AdminRelatorios {}
