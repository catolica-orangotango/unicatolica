/**
 * Leitura do SCSS-fonte nos specs de contrato de estilo da casca e das barras
 * do celular: corpo dos blocos `@media` e declarações de um seletor exato.
 */

/** Fonte sem comentários de bloco nem de linha. */
export function semComentarios(scss: string): string {
  return scss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Corpo (sem as chaves) de cada bloco que abre logo depois de `cabecalho`. */
export function blocos(fonte: string, cabecalho: string): string[] {
  const out: string[] = [];
  let de = fonte.indexOf(cabecalho);
  while (de >= 0) {
    const abre = fonte.indexOf('{', de);
    let nivel = 0;
    let i = abre;
    for (; i < fonte.length; i++) {
      if (fonte[i] === '{') nivel++;
      else if (fonte[i] === '}' && --nivel === 0) break;
    }
    out.push(fonte.slice(abre + 1, i));
    de = fonte.indexOf(cabecalho, i);
  }
  return out;
}

/** Fonte só com as regras de primeiro nível (sem os corpos de `@media` e `@keyframes`). */
export function foraDeMedia(fonte: string): string {
  let texto = fonte;
  for (const cabecalho of ['@media', '@keyframes']) {
    for (const corpo of blocos(texto, cabecalho)) texto = texto.replace(corpo, '');
  }
  return texto;
}

/** Declarações de `seletor` (match exato do seletor antes da chave) dentro de `fonte`. */
export function regra(fonte: string, seletor: string): string {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`(?:^|[}\\s,])${escapado}\\s*\\{([^}]*)\\}`, 'm').exec(fonte);
  return m ? m[1] : '';
}
