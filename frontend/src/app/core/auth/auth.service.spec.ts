import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService, JWT_ROLES_CLAIM } from './auth.service';

/** Base64url de uma string UTF-8 (sem padding), como um JWT real. */
function base64url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach((byte) => (binario += String.fromCharCode(byte)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Monta um JWT `header.payload.assinatura` com o payload informado. */
function jwtComPayload(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  return `${header}.${base64url(JSON.stringify(payload))}.assinatura-ignorada`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('envia email e senha para POST /auth/login', () => {
    service.login('aluno@catolicasc.edu.br', 'Senha123!').subscribe();

    const req = httpMock.expectOne('http://localhost:8080/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'aluno@catolicasc.edu.br', senha: 'Senha123!' });
    req.flush({ token: 'token-fake' });
  });

  it('armazena o token retornado para uso posterior', () => {
    service.login('aluno@catolicasc.edu.br', 'Senha123!').subscribe();

    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: 'token-fake' });

    expect(service.obterToken()).toBe('token-fake');
  });

  // -- KAN-78: sessão expirada ---------------------------------------------

  it('sessaoValida: false sem token', () => {
    expect(service.sessaoValida()).toBe(false);
  });

  it('sessaoValida: true com exp no futuro', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    localStorage.setItem('pacext.token', jwtComPayload({ sub: '1', exp }));

    expect(service.sessaoValida()).toBe(true);
  });

  it('sessaoValida: false com exp no passado', () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    localStorage.setItem('pacext.token', jwtComPayload({ sub: '1', exp }));

    expect(service.sessaoValida()).toBe(false);
  });

  it('sessaoValida: true com token sem exp legível (o backend decide)', () => {
    localStorage.setItem('pacext.token', 'token-fake');

    expect(service.sessaoValida()).toBe(true);
  });

  it('encerrarSessaoLocal apaga o token sem chamar o servidor', () => {
    localStorage.setItem('pacext.token', 'token-fake');

    service.encerrarSessaoLocal();

    expect(service.obterToken()).toBeNull();
    httpMock.expectNone('http://localhost:8080/auth/logout');
  });

  it('renovar: POST /auth/refresh com o token atual e guarda o token novo', () => {
    localStorage.setItem('pacext.token', 'token-atual');

    service.renovar().subscribe();

    const req = httpMock.expectOne('http://localhost:8080/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-atual');
    req.flush({ token: 'token-novo' });
    expect(service.obterToken()).toBe('token-novo');
  });

  it('periodoDoToken: iat e exp em milissegundos; null sem as claims', () => {
    localStorage.setItem('pacext.token', jwtComPayload({ sub: '1', iat: 100, exp: 1000 }));
    expect(service.periodoDoToken()).toEqual({ emitidoEm: 100_000, expiraEm: 1_000_000 });

    localStorage.setItem('pacext.token', 'token-fake');
    expect(service.periodoDoToken()).toBeNull();
  });

  it('remove o token armazenado ao fazer logout', () => {
    service.login('aluno@catolicasc.edu.br', 'Senha123!').subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: 'token-fake' });

    service.logout();

    expect(service.obterToken()).toBeNull();
    httpMock.expectOne('http://localhost:8080/auth/logout').flush(null);
  });

  it('envia o token atual como Bearer para POST /auth/logout', () => {
    service.login('aluno@catolicasc.edu.br', 'Senha123!').subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: 'token-fake' });

    service.logout();

    const req = httpMock.expectOne('http://localhost:8080/auth/logout');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    req.flush(null);
  });

  it('loga (nao silencia) uma falha do backend no logout', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    service.login('aluno@catolicasc.edu.br', 'Senha123!').subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: 'token-fake' });

    service.logout();

    httpMock
      .expectOne('http://localhost:8080/auth/logout')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(consoleErrorSpy).toHaveBeenCalled();
    // Falhar no backend nao pode impedir o logout local (defeito D8: continua best-effort).
    expect(service.obterToken()).toBeNull();
  });

  it('nao chama o backend no logout se nao havia token armazenado', () => {
    service.logout();

    expect(service.obterToken()).toBeNull();
    httpMock.expectNone('http://localhost:8080/auth/logout');
  });

  describe('perfis() / possuiPerfil()', () => {
    it('a constante do nome da claim vale "roles" (contrato com o backend)', () => {
      expect(JWT_ROLES_CLAIM).toBe('roles');
    });

    it('le a claim escrita com a string literal "roles" (nao via a constante importada)', () => {
      const header = base64url(JSON.stringify({ alg: 'none' }));
      const payload = base64url('{"sub":"u1","roles":["MODERADOR"]}');
      localStorage.setItem('pacext.token', `${header}.${payload}.assinatura-ignorada`);

      expect(service.perfis()).toEqual(['MODERADOR']);
    });

    it('le a claim de perfis (roles) de um token com forma real do backend', () => {
      localStorage.setItem(
        'pacext.token',
        jwtComPayload({ sub: 'aluno-1', [JWT_ROLES_CLAIM]: ['MODERADOR'] }),
      );

      expect(service.perfis()).toEqual(['MODERADOR']);
      expect(service.possuiPerfil('MODERADOR')).toBe(true);
      expect(service.possuiPerfil('ADMINISTRADOR')).toBe(false);
    });

    it('retorna [] quando a claim de perfis esta ausente', () => {
      localStorage.setItem('pacext.token', jwtComPayload({ sub: 'aluno-1' }));

      expect(service.perfis()).toEqual([]);
      expect(service.possuiPerfil('MODERADOR')).toBe(false);
    });

    it('retorna [] para um token malformado', () => {
      localStorage.setItem('pacext.token', 'isto-nao-e-um-jwt');

      expect(service.perfis()).toEqual([]);
    });

    it('retorna [] quando nao ha token armazenado', () => {
      expect(service.perfis()).toEqual([]);
    });

    it('decodifica payload com caracteres multibyte sem lancar', () => {
      localStorage.setItem(
        'pacext.token',
        jwtComPayload({ nome: 'Ação Coração 日本語', [JWT_ROLES_CLAIM]: ['ALUNO'] }),
      );

      expect(service.perfis()).toEqual(['ALUNO']);
    });

    it('ignora valores nao-string dentro da claim de perfis', () => {
      localStorage.setItem(
        'pacext.token',
        jwtComPayload({ [JWT_ROLES_CLAIM]: ['ALUNO', 42, null, 'MODERADOR'] }),
      );

      expect(service.perfis()).toEqual(['ALUNO', 'MODERADOR']);
    });

    it('trata uma claim de perfil escalar (string) como lista de um item', () => {
      localStorage.setItem('pacext.token', jwtComPayload({ [JWT_ROLES_CLAIM]: 'ADMINISTRADOR' }));

      expect(service.perfis()).toEqual(['ADMINISTRADOR']);
      expect(service.possuiPerfil('ADMINISTRADOR')).toBe(true);
    });

    it('retorna [] quando o payload decodificado e um array (nao um objeto de claims)', () => {
      localStorage.setItem(
        'pacext.token',
        jwtComPayload(['MODERADOR', 'ADMINISTRADOR'] as unknown as Record<string, unknown>),
      );

      expect(service.perfis()).toEqual([]);
    });
  });

  describe('usuarioId()', () => {
    it('le o id numerico da claim sub', () => {
      localStorage.setItem('pacext.token', jwtComPayload({ sub: '42', [JWT_ROLES_CLAIM]: ['ALUNO'] }));

      expect(service.usuarioId()).toBe(42);
    });

    it('retorna null quando sub nao e numerico', () => {
      localStorage.setItem('pacext.token', jwtComPayload({ sub: 'e2e-user' }));

      expect(service.usuarioId()).toBeNull();
    });

    it('retorna null sem sub, sem token ou com token malformado', () => {
      localStorage.setItem('pacext.token', jwtComPayload({}));
      expect(service.usuarioId()).toBeNull();

      localStorage.setItem('pacext.token', 'isto-nao-e-um-jwt');
      expect(service.usuarioId()).toBeNull();

      localStorage.clear();
      expect(service.usuarioId()).toBeNull();
    });
  });
});
