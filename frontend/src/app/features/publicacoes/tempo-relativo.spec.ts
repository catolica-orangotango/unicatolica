import { iniciais, tempoRelativo } from './tempo-relativo';

describe('tempoRelativo', () => {
  const agora = new Date('2026-09-30T12:00:00Z');
  const antes = (ms: number) => new Date(agora.getTime() - ms).toISOString();

  it('menos de um minuto é "agora"', () => {
    expect(tempoRelativo(antes(30_000), agora)).toBe('agora');
  });

  it('data no futuro (relógio do cliente atrasado) também é "agora"', () => {
    expect(tempoRelativo(new Date(agora.getTime() + 60_000).toISOString(), agora)).toBe('agora');
  });

  it('minutos, horas e dias', () => {
    expect(tempoRelativo(antes(5 * 60_000), agora)).toBe('há 5 min');
    expect(tempoRelativo(antes(2 * 3_600_000), agora)).toBe('há 2 h');
    expect(tempoRelativo(antes(26 * 3_600_000), agora)).toBe('há 1 dia');
    expect(tempoRelativo(antes(3 * 86_400_000), agora)).toBe('há 3 dias');
  });

  it('a partir de uma semana mostra a data', () => {
    expect(tempoRelativo('2026-09-01T12:00:00Z', agora)).toBe('01/09/2026');
  });
});

describe('iniciais', () => {
  it('primeira letra do primeiro e do último nome', () => {
    expect(iniciais('Maria Clara de Souza')).toBe('MS');
  });

  it('nome único e nome vazio', () => {
    expect(iniciais('rafael')).toBe('R');
    expect(iniciais('   ')).toBe('?');
  });
});
