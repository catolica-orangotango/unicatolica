import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Painel inicial da área de administração: leva às telas de /admin ("Cursos" e "Usuários"). */
@Component({
  selector: 'app-painel-admin',
  imports: [RouterLink],
  templateUrl: './painel-admin.html',
  styleUrl: './painel-admin.scss',
})
export class PainelAdmin {}
