import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';

/** Espelha `ArquivoResponse` do `openapi.yaml` (`POST /arquivos`). */
export interface ArquivoEnviado {
  id: number;
  nome: string;
  tipo: string;
  tamanho: number;
}

export type FinalidadeArquivo = 'ANEXO_POSTAGEM' | 'FOTO_PERFIL';

/** Limites do contrato: PDF até 5 MB, imagem (PNG/JPEG) até 2 MB. */
export const LIMITE_PDF_BYTES = 5 * 1024 * 1024;
export const LIMITE_IMAGEM_BYTES = 2 * 1024 * 1024;

export const MensagemFormatosAceitos = 'Formato não aceito. Envie um arquivo PNG, JPEG ou PDF.';

/**
 * Conferência de conveniência no navegador (o servidor valida pelo conteúdo): evita mandar
 * corpo grande demais, que o servidor pode responder derrubando a conexão.
 * Devolve a mensagem de erro, ou `null` se o arquivo serve.
 */
export function validarArquivo(arquivo: File): string | null {
  const ehPdf = arquivo.type === 'application/pdf';
  const ehImagem = arquivo.type === 'image/png' || arquivo.type === 'image/jpeg';
  if (!ehPdf && !ehImagem) {
    return MensagemFormatosAceitos;
  }
  if (ehPdf && arquivo.size > LIMITE_PDF_BYTES) {
    return 'O PDF passa do limite de 5 MB. Escolha um arquivo menor.';
  }
  if (ehImagem && arquivo.size > LIMITE_IMAGEM_BYTES) {
    return 'A imagem passa do limite de 2 MB. Escolha um arquivo menor (PNG ou JPEG).';
  }
  return null;
}

/** Módulo Mídia: `POST /arquivos` (multipart). Sem `Content-Type` manual: o navegador põe o boundary. */
@Injectable({ providedIn: 'root' })
export class MidiaService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  enviar(arquivo: File, finalidade: FinalidadeArquivo): Observable<ArquivoEnviado> {
    const corpo = new FormData();
    corpo.append('finalidade', finalidade);
    corpo.append('arquivo', arquivo);
    return this.http.post<ArquivoEnviado>(`${API_BASE_URL}/arquivos`, corpo, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }
}
