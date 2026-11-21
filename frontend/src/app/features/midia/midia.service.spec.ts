import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { LIMITE_IMAGEM_BYTES, LIMITE_PDF_BYTES, MensagemFormatosAceitos, MidiaService, validarArquivo } from './midia.service';

function arquivo(nome: string, tipo: string, tamanho = 10): File {
  const f = new File(['x'], nome, { type: tipo });
  Object.defineProperty(f, 'size', { value: tamanho });
  return f;
}

describe('MidiaService', () => {
  let service: MidiaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('pacext.token', 'token-fake');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MidiaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('envia FormData com finalidade e arquivo para POST /arquivos com o Bearer', () => {
    const png = arquivo('foto.png', 'image/png');
    let recebido: unknown;
    service.enviar(png, 'ANEXO_POSTAGEM').subscribe((r) => (recebido = r));

    const req = httpMock.expectOne(`${API_BASE_URL}/arquivos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    const corpo = req.request.body as FormData;
    expect(corpo.get('finalidade')).toBe('ANEXO_POSTAGEM');
    expect((corpo.get('arquivo') as File).name).toBe('foto.png');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    expect(req.request.headers.has('Content-Type')).toBe(false);
    const resposta = { id: 5, nome: 'foto.png', tipo: 'image/png', tamanho: 10 };
    req.flush(resposta);
    expect(recebido).toEqual(resposta);
  });

  describe('validarArquivo', () => {
    it('aceita PNG, JPEG e PDF dentro do limite', () => {
      expect(validarArquivo(arquivo('a.png', 'image/png'))).toBeNull();
      expect(validarArquivo(arquivo('a.jpg', 'image/jpeg'))).toBeNull();
      expect(validarArquivo(arquivo('a.pdf', 'application/pdf', LIMITE_PDF_BYTES))).toBeNull();
      expect(validarArquivo(arquivo('a.png', 'image/png', LIMITE_IMAGEM_BYTES))).toBeNull();
    });

    it('recusa tipo fora de PNG/JPEG/PDF com a mensagem dos formatos', () => {
      expect(validarArquivo(arquivo('a.gif', 'image/gif'))).toBe(MensagemFormatosAceitos);
      expect(MensagemFormatosAceitos).toContain('PNG');
    });

    it('sem type, deduz pela extensão (maiúsculas incluídas)', () => {
      expect(validarArquivo(arquivo('a.png', '', LIMITE_IMAGEM_BYTES))).toBeNull();
      expect(validarArquivo(arquivo('A.JPEG', ''))).toBeNull();
      expect(validarArquivo(arquivo('a.jpg', ''))).toBeNull();
      expect(validarArquivo(arquivo('a.pdf', '', LIMITE_PDF_BYTES))).toBeNull();
      expect(validarArquivo(arquivo('a.png', '', LIMITE_IMAGEM_BYTES + 1))).toContain('2 MB');
      expect(validarArquivo(arquivo('a.PDF', '', LIMITE_PDF_BYTES + 1))).toContain('5 MB');
    });

    it('sem type e extensão desconhecida ou ausente é recusado', () => {
      expect(validarArquivo(arquivo('a.txt', ''))).toBe(MensagemFormatosAceitos);
      expect(validarArquivo(arquivo('semextensao', ''))).toBe(MensagemFormatosAceitos);
    });

    it('foto de perfil recusa PDF, com ou sem type', () => {
      expect(validarArquivo(arquivo('a.pdf', 'application/pdf'), 'FOTO_PERFIL')).toContain('foto de perfil');
      expect(validarArquivo(arquivo('a.pdf', ''), 'FOTO_PERFIL')).toContain('foto de perfil');
      expect(validarArquivo(arquivo('a.png', ''), 'FOTO_PERFIL')).toBeNull();
    });

    it('recusa imagem acima de 2 MB e PDF acima de 5 MB', () => {
      expect(validarArquivo(arquivo('a.png', 'image/png', LIMITE_IMAGEM_BYTES + 1))).toContain('2 MB');
      expect(validarArquivo(arquivo('a.pdf', 'application/pdf', LIMITE_PDF_BYTES + 1))).toContain('5 MB');
    });
  });
});
