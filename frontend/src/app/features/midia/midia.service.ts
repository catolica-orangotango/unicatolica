import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
export const MensagemFotoFormato = 'Formato não aceito. A foto de perfil deve ser PNG ou JPEG.';

/** Mensagem do servidor para erros 4xx (menos 401, tratado pelo interceptor de sessão); senão o `padrao`. */
export function mensagemDoServidor(erro: HttpErrorResponse, padrao: string): string {
  const mensagem: unknown = erro.error?.error?.message;
  return erro.status >= 400 && erro.status < 500 && erro.status !== 401 && typeof mensagem === 'string'
    ? mensagem
    : padrao;
}

/** O servidor valida pelo conteúdo; aqui, na falta de `File.type`, vale a extensão do nome. */
function tipoDoArquivo(arquivo: File): string {
  if (arquivo.type !== '') {
    return arquivo.type;
  }
  const extensao = arquivo.name.includes('.') ? arquivo.name.split('.').pop()!.toLowerCase() : '';
  return { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', pdf: 'application/pdf' }[extensao] ?? '';
}

/**
 * Conferência de conveniência no navegador (o servidor valida pelo conteúdo): evita mandar
 * corpo grande demais, que o servidor pode responder derrubando a conexão.
 * Devolve a mensagem de erro, ou `null` se o arquivo serve.
 */
export function validarArquivo(arquivo: File, finalidade: FinalidadeArquivo = 'ANEXO_POSTAGEM'): string | null {
  const tipo = tipoDoArquivo(arquivo);
  const ehPdf = tipo === 'application/pdf';
  const ehImagem = tipo === 'image/png' || tipo === 'image/jpeg';
  if (ehPdf && finalidade === 'FOTO_PERFIL') {
    return MensagemFotoFormato;
  }
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
