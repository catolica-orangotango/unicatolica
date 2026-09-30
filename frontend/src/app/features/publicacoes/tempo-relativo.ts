const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Horário relativo do feed (RF36): "agora", "há 5 min", "há 2 h", "há 3 dias"; a partir
 * de uma semana, a data (dd/mm/aaaa). `agora` é parâmetro para o teste não depender do relógio.
 */
export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  const data = new Date(iso);
  const diferenca = Math.max(0, agora.getTime() - data.getTime());

  if (diferenca < MINUTO) {
    return 'agora';
  }
  if (diferenca < HORA) {
    return `há ${Math.floor(diferenca / MINUTO)} min`;
  }
  if (diferenca < DIA) {
    return `há ${Math.floor(diferenca / HORA)} h`;
  }
  const dias = Math.floor(diferenca / DIA);
  if (dias < 7) {
    return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
  }
  return data.toLocaleDateString('pt-BR');
}

/** Iniciais do avatar: primeira letra do primeiro e do último nome. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return '?';
  }
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}
