import { Component } from '@angular/core';
import { AvisosAdmin } from '../avisos-admin/avisos-admin';
import { CursosAdmin } from '../cursos-admin/cursos-admin';

/**
 * Tela inicial da Administração (`/admin/cursos`): o card "Publicar aviso" (Story 13.1) ao lado
 * da manutenção de cursos. Sem lógica: só dispõe os dois blocos, lado a lado no desktop.
 */
@Component({
  selector: 'app-cursos-e-avisos',
  imports: [AvisosAdmin, CursosAdmin],
  template: `
    <div class="painel">
      <app-avisos-admin />
      <app-cursos-admin />
    </div>
  `,
  styleUrl: './cursos-e-avisos.scss',
})
export class CursosEAvisos {}
