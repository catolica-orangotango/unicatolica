/**
 * Story 14.7 - global base layer contract.
 *
 * Same compiled-Sass path as `tokens.spec.ts`: compile `src/styles.scss` with
 * the `sass` package and assert against the produced CSS. There is NO
 * source-text fallback - a compile throw fails every test in the file.
 *
 * What it pins:
 *  - `body` exists and paints the canvas with tokens only (bg / ink / the font
 *    stack / body size / body line-height). Without this rule the three public
 *    screens never get the Campus Clean canvas or the token font.
 *  - the `box-sizing` reset and the `margin: 0` on `html, body` exist;
 *  - one global `:focus-visible` ring exists, maroon, token-valued;
 *  - form controls inherit the document font;
 *  - no hex literal leaked anywhere outside the `:root` token block, and the
 *    base layer declares no `--uc-*` custom property of its own (that would
 *    escape the exact-set assertion in `tokens.spec.ts`).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const stylesDir = dirname(fileURLToPath(import.meta.url));
const entryScss = join(stylesDir, '..', 'styles.scss');

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Brace-balanced body of the first rule whose selector list matches exactly.
 * Selector parts are joined whitespace-tolerantly so the assertions do not
 * depend on how Sass happens to wrap a multi-part selector.
 */
function extractRuleBody(css: string, ...selectorParts: string[]): string | null {
  const escaped = selectorParts
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*,\\s*');
  const head = new RegExp(`(^|})\\s*${escaped}\\s*{`);
  const m = head.exec(css);
  if (!m) return null;
  const open = css.indexOf('{', m.index);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  return null;
}

function parseDeclarations(ruleBody: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of ruleBody
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)) {
    const idx = decl.indexOf(':');
    out[decl.slice(0, idx).trim()] = decl.slice(idx + 1).trim();
  }
  return out;
}

let compiledCss = '';

beforeAll(() => {
  compiledCss = stripComments(sass.compile(entryScss, { style: 'expanded' }).css).replace(
    /^\s*@charset\s+"[^"]*";\s*/i,
    '',
  );
});

describe('body canvas', () => {
  it('exists and paints bg / ink / font stack / body size / line-height from tokens', () => {
    const body = extractRuleBody(compiledCss, 'body');
    expect(body, 'no body rule in the compiled bundle').not.toBeNull();

    expect(parseDeclarations(body!)).toEqual({
      background: 'var(--uc-color-bg)',
      color: 'var(--uc-color-ink)',
      'font-family': 'var(--uc-font-family-base)',
      'font-size': 'var(--uc-font-size-body)',
      'line-height': 'var(--uc-line-height-body)',
    });
  });

  it('zeroes the default html/body margin', () => {
    const margins = extractRuleBody(compiledCss, 'html', 'body');
    expect(margins, 'no `html, body { margin: 0 }` rule').not.toBeNull();
    expect(parseDeclarations(margins!)).toEqual({ margin: '0' });
  });
});

describe('reset', () => {
  it('applies border-box to every element and pseudo-element', () => {
    const reset = extractRuleBody(compiledCss, '*', '*::before', '*::after');
    expect(reset, 'no universal box-sizing reset').not.toBeNull();
    expect(parseDeclarations(reset!)).toEqual({ 'box-sizing': 'border-box' });
  });

  it('makes form controls inherit the document font', () => {
    const controls = extractRuleBody(compiledCss, 'button', 'input', 'select', 'textarea');
    expect(controls, 'no `font: inherit` rule for form controls').not.toBeNull();
    expect(parseDeclarations(controls!)).toEqual({ font: 'inherit' });
  });
});

describe('global focus ring', () => {
  it('sets one maroon :focus-visible outline, token-valued', () => {
    const ring = extractRuleBody(compiledCss, ':focus-visible');
    expect(ring, 'no global :focus-visible rule').not.toBeNull();

    expect(parseDeclarations(ring!)).toEqual({
      outline: '2px solid var(--uc-color-maroon)',
      'outline-offset': '2px',
    });
  });
});

/** Compiled CSS minus the `:root` token block, or a named failure if it is gone. */
function outsideRoot(): string {
  const rootBody = extractRuleBody(compiledCss, ':root');
  expect(rootBody, 'compiled bundle has no :root block').not.toBeNull();
  return compiledCss.replace(rootBody!, '');
}

describe('the base layer introduces no design value of its own', () => {
  it('has no hex literal outside the :root token block', () => {
    const hexes = [...outsideRoot().matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
    expect(hexes, `hex literal(s) outside :root: ${hexes.join(', ')}`).toEqual([]);
  });

  it('declares no --uc-* custom property outside the :root token block', () => {
    // Única exceção: a sobrescrita da margem de página no @media do celular (tokens.spec.ts a fixa).
    expect([...outsideRoot().matchAll(/--uc-[a-z0-9-]+\s*:/g)].map((m) => m[0])).toEqual([
      '--uc-space-page-margin:',
    ]);
  });
});

/**
 * Story 14.1's `tokens.spec.ts` bounded the global bundle with "every rule
 * selector is :root or a class selector". Story 14.7 had to drop it - the base
 * layer styles bare element selectors by design - and this replaces it with the
 * narrower bound that still holds: the base layer may style THESE elements and
 * no others. Without it a global `a {}` or `h1 {}` added to `_base.scss` would
 * restyle every link and heading in the app with the suite fully green (both
 * would be token-valued, so `scss-guard.spec.ts` would not object either).
 */
const SELETORES_GLOBAIS_PERMITIDOS = [
  ':root',
  '*, *::before, *::after',
  'html, body',
  'body',
  'button, input, select, textarea',
  ':focus-visible',
];

describe('the base layer styles nothing beyond its declared surface', () => {
  it('emits exactly the allowed global selectors, nothing else', () => {
    const selectors = [...compiledCss.matchAll(/(^|})\s*([^{}@]+?)\s*\{/g)].map((m) =>
      m[2].replace(/\s+/g, ' ').trim(),
    );
    expect(selectors.length, 'compiled bundle has no rules at all').toBeGreaterThan(0);

    const inesperados = selectors.filter(
      (selector) =>
        !SELETORES_GLOBAIS_PERMITIDOS.includes(selector) &&
        // The `.uc-text-*` type-role utilities of Story 14.1 are class selectors,
        // scoped by definition; anything else global is the regression we hunt.
        !selector.split(',').every((part) => part.trim().startsWith('.')),
    );
    expect(
      [...new Set(inesperados)],
      'unexpected global selector(s) in the compiled bundle - a global element rule reaches every screen',
    ).toEqual([]);
  });
});

/**
 * The base layer only exists if `angular.json` still lists `src/styles.scss` as
 * a build style. Every other assertion in this file compiles the partial
 * straight off disk with `sass`, so all of them stay green while the bundle
 * ships without the canvas, the token font stack and the global focus ring.
 */
describe('the entry point is wired into the build', () => {
  it('angular.json lists src/styles.scss among the build styles', () => {
    const angularJson = JSON.parse(
      readFileSync(join(stylesDir, '..', '..', 'angular.json'), 'utf8'),
    ) as {
      projects: Record<string, { architect: { build: { options: { styles?: unknown } } } }>;
    };

    const styles = angularJson.projects['frontend']?.architect.build.options.styles;
    expect(styles, 'angular.json declares no build styles at all').toBeDefined();
    expect(
      styles,
      'src/styles.scss is not a build style - the whole base layer ships unwired',
    ).toContain('src/styles.scss');
  });
});

/**
 * KAN-91: a familia `Inter` do token so existe de fato se o `index.html` a
 * carregar (Google Fonts, `display=swap`); o fallback `system-ui` cobre a espera.
 */
describe('fonte Inter', () => {
  it('index.html carrega a Inter e o token de familia tem o fallback system-ui', () => {
    const indexHtml = readFileSync(join(stylesDir, '..', 'index.html'), 'utf8');
    expect(indexHtml).toContain('href="https://fonts.googleapis.com"');
    expect(indexHtml).toContain('href="https://fonts.gstatic.com"');
    expect(indexHtml).toMatch(
      /fonts\.googleapis\.com\/css2\?family=Inter:wght@400;500;600;700&display=swap/,
    );

    const tokens = readFileSync(join(stylesDir, '_tokens.scss'), 'utf8');
    expect(tokens).toMatch(/--uc-font-family-base:\s*Inter,\s*system-ui/);
  });
});
