/**
 * Story 14.1 - design tokens and typography.
 *
 * Compiled-Sass path only: this spec compiles `src/styles.scss` with the `sass`
 * package and asserts against the produced CSS. There is NO source-text
 * fallback. A `sass` import failure, a compile throw, or a `:root` with zero
 * `--uc-*` custom properties is a hard failure (the frozen I/O matrix demands
 * "Sass compile error -> tokens.spec.ts fails").
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const stylesDir = dirname(fileURLToPath(import.meta.url));
const entryScss = join(stylesDir, '..', 'styles.scss');
const readmePath = join(stylesDir, 'README.md');

/**
 * EXPECTED lists the tokens of the redesign (KAN-91), with the values of the
 * DESIGN.md frontmatter (origin: docs/decisoes/2026-10-24-nova-direcao-visual.md).
 * It is the contract: the compiled `--uc-*` set must equal this key set exactly.
 */
const EXPECTED: Record<string, Record<string, string>> = {
  colors: {
    '--uc-color-bg': '#FFFFFF',
    '--uc-color-surface': '#FFFFFF',
    '--uc-color-surface-muted': '#F7F7F8',
    '--uc-color-surface-strong': '#F1F1F3',
    '--uc-color-border': '#ECECEE',
    '--uc-color-border-strong': '#E2E2E6',
    '--uc-color-border-input': '#8E8E96',
    '--uc-color-ink': '#18181B',
    '--uc-color-ink-soft': '#66666E',
    '--uc-color-ink-faint': '#707078',
    '--uc-color-ink-nav': '#3F3F46',
    '--uc-color-ink-disabled': '#8A8A93',
    '--uc-color-maroon': '#7A1F2B',
    '--uc-color-maroon-hover': '#691A25',
    '--uc-color-maroon-tint': '#F7ECEE',
    '--uc-color-green-ok': '#2F6141',
    '--uc-color-green-tint': '#EAF3EC',
    '--uc-color-error': '#B3261E',
    '--uc-color-error-tint': '#FBEAE9',
    '--uc-color-error-border': '#F0C9C6',
    '--uc-color-warn': '#8A5A00',
    '--uc-color-warn-tint': '#FDF5E7',
    '--uc-color-toast-ok': '#B9E4C9',
    '--uc-color-toast-error': '#FFB4AB',
    '--uc-color-avatar-blue': '#2B4A72',
    '--uc-color-avatar-green': '#2F6141',
    '--uc-color-avatar-sand': '#6B4E1F',
    '--uc-color-avatar-violet': '#4E3A72',
    '--uc-color-avatar-blue-bg': '#E8EEF6',
    '--uc-color-avatar-green-bg': '#EAF3EC',
    '--uc-color-avatar-sand-bg': '#F3EEE6',
    '--uc-color-avatar-violet-bg': '#EFEAF6',
  },
  typography: {
    '--uc-font-family-base': "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    '--uc-font-size-greeting': '22px',
    '--uc-font-size-title-lg': '24px',
    '--uc-font-size-title': '17px',
    '--uc-font-size-body': '15px',
    '--uc-font-size-small': '14px',
    '--uc-font-size-meta': '13px',
    '--uc-font-size-label': '12px',
    '--uc-font-weight-regular': '400',
    '--uc-font-weight-medium': '500',
    '--uc-font-weight-semibold': '600',
    '--uc-font-weight-bold': '700',
    '--uc-line-height-body': '1.5',
    '--uc-letter-spacing-greeting': '-0.02em',
  },
  spacing: {
    '--uc-space-unit': '4px',
    '--uc-space-1': '4px',
    '--uc-space-2': '8px',
    '--uc-space-3': '12px',
    '--uc-space-4': '16px',
    '--uc-space-5': '20px',
    '--uc-space-6': '24px',
    '--uc-space-7': '32px',
    '--uc-space-8': '40px',
    '--uc-space-card-padding': '18px',
    '--uc-space-section-gap': '20px',
    '--uc-space-page-margin': '24px',
    '--uc-layout-nav': '248px',
    '--uc-layout-feed': '600px',
    '--uc-layout-aside': '340px',
    '--uc-layout-wide': '1040px',
    '--uc-layout-gap': '32px',
    '--uc-touch-target': '44px',
  },
  rounded: {
    '--uc-radius-sm': '8px',
    '--uc-radius-default': '10px',
    '--uc-radius-md': '12px',
    '--uc-radius-lg': '16px',
    '--uc-radius-xl': '20px',
    '--uc-radius-full': '9999px',
  },
  shadow: {
    '--uc-shadow-overlay': '0 8px 32px rgba(24, 24, 27, 0.12), 0 1px 3px rgba(24, 24, 27, 0.06)',
    '--uc-shadow-toast': '0 8px 32px rgba(24, 24, 27, 0.18)',
  },
};

const EXPECTED_KEYS = Object.values(EXPECTED)
  .flatMap((group) => Object.keys(group))
  .sort();

const TEXT_ROLES = ['greeting', 'title-lg', 'title', 'body', 'small', 'meta', 'label'] as const;

/**
 * The exact declaration set each `.uc-text-*` class must carry, per the redesign
 * `typography`: font-size + font-weight for every role, line-height only for
 * `body`, letter-spacing only for `greeting` and `title-lg`. Nothing else --
 * no `font-family`, no `text-transform`. Values are `var(--uc-*)` references
 * whose names must resolve against the compiled `:root` token set.
 */
const ROLE_DECLS: Record<string, Record<string, string>> = {
  greeting: {
    'font-size': 'var(--uc-font-size-greeting)',
    'font-weight': 'var(--uc-font-weight-semibold)',
    'letter-spacing': 'var(--uc-letter-spacing-greeting)',
  },
  'title-lg': {
    'font-size': 'var(--uc-font-size-title-lg)',
    'font-weight': 'var(--uc-font-weight-bold)',
    'letter-spacing': 'var(--uc-letter-spacing-greeting)',
  },
  title: {
    'font-size': 'var(--uc-font-size-title)',
    'font-weight': 'var(--uc-font-weight-bold)',
  },
  body: {
    'font-size': 'var(--uc-font-size-body)',
    'font-weight': 'var(--uc-font-weight-regular)',
    'line-height': 'var(--uc-line-height-body)',
  },
  meta: {
    'font-size': 'var(--uc-font-size-meta)',
    'font-weight': 'var(--uc-font-weight-regular)',
  },
  small: {
    'font-size': 'var(--uc-font-size-small)',
    'font-weight': 'var(--uc-font-weight-regular)',
  },
  label: {
    'font-size': 'var(--uc-font-size-label)',
    'font-weight': 'var(--uc-font-weight-semibold)',
  },
};

// -- helpers -----------------------------------------------------------------

const normalizeWs = (s: string): string => s.trim().replace(/\s+/g, ' ');

const canonHex = (s: string): string => s.replace(/#[0-9a-fA-F]{3,8}\b/g, (h) => h.toUpperCase());

const normalizeValue = (s: string): string => canonHex(normalizeWs(s));

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Brace-balanced body of the first rule whose selector matches exactly. */
function extractRuleBody(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function parseCustomProps(rootBody: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const decl of rootBody.split(';')) {
    const m = decl.match(/(--uc-[a-z0-9-]+)\s*:\s*([\s\S]+)/);
    if (m) out.set(m[1], m[2].trim());
  }
  return out;
}

// -- compile (no try/catch: a throw here fails every test in the file) ------

let compiledCss = '';
let tokenProps = new Map<string, string>();

beforeAll(() => {
  compiledCss = stripComments(sass.compile(entryScss, { style: 'expanded' }).css).replace(
    /^\s*@charset\s+"[^"]*";\s*/i,
    '',
  );
  const rootBody = extractRuleBody(compiledCss, ':root');
  if (rootBody === null) {
    throw new Error('compiled styles.scss has no :root block');
  }
  tokenProps = parseCustomProps(rootBody);
  if (tokenProps.size === 0) {
    throw new Error('compiled :root exposes zero --uc-* custom properties');
  }
});

// -- token name + value ----------------------------------------------------

for (const [group, tokens] of Object.entries(EXPECTED)) {
  describe(`tokens: ${group}`, () => {
    for (const [name, value] of Object.entries(tokens)) {
      it(`${name} is present with the expected value`, () => {
        expect(tokenProps.has(name)).toBe(true);
        expect(normalizeValue(tokenProps.get(name)!)).toBe(normalizeValue(value));
      });
    }
  });
}

// -- exact token set -----------------------------------------------------

describe('token set', () => {
  it('the compiled --uc-* set equals EXPECTED exactly (no extra, none missing)', () => {
    expect([...new Set(tokenProps.keys())].sort()).toEqual(EXPECTED_KEYS);
  });

  it('não declara nenhum token marcado "sai"', () => {
    const sai = [
      '--uc-color-orange',
      '--uc-color-orange-tint',
      '--uc-font-size-question',
      '--uc-font-size-label-caps',
      '--uc-font-weight-caps',
      '--uc-letter-spacing-label-caps',
    ];
    for (const nome of sai) {
      expect(tokenProps.has(nome), nome).toBe(false);
    }
  });
});

// -- README drift guard --------------------------------------------------

describe('README.md token table', () => {
  it('lists exactly the compiled tokens, each with the compiled value', () => {
    const readme = readFileSync(readmePath, 'utf8');
    const rows = [...readme.matchAll(/^ {0,3}\|\s*`(--uc-[a-z0-9-]+)`\s*\|\s*`([^`]+)`\s*\|/gm)];
    const documented = new Map(rows.map((r) => [r[1], r[2].trim()]));

    expect([...documented.keys()].sort()).toEqual(EXPECTED_KEYS);
    for (const [name, docValue] of documented) {
      expect(normalizeValue(docValue)).toBe(normalizeValue(tokenProps.get(name)!));
    }
  });
});

// -- .uc-text-* utilities ----------------------------------------------

/** Parse a rule body into an ordered { property: value } map. */
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

describe('.uc-text-* utility classes', () => {
  for (const role of TEXT_ROLES) {
    it(`.uc-text-${role} sets exactly the expected property set, values only var(--uc-*)`, () => {
      const body = extractRuleBody(compiledCss, `.uc-text-${role}`);
      expect(body, `.uc-text-${role} rule missing from compiled CSS`).not.toBeNull();

      const decls = parseDeclarations(body!);

      // Exact property set + exact token per property -- catches a dropped
      // font-weight, a stray letter-spacing on meta/question/body, and any
      // added font-family / text-transform.
      expect(decls).toEqual(ROLE_DECLS[role]);

      // Every referenced --uc-* name resolves against the compiled :root set,
      // so a typo like var(--uc-font-wieght-regular) fails here.
      for (const value of Object.values(decls)) {
        const ref = value.match(/^var\((--uc-[a-z0-9-]+)\)$/);
        expect(ref, `value ${value} is not a bare var(--uc-*) reference`).not.toBeNull();
        expect(tokenProps.has(ref![1]), `${value} references an undefined token`).toBe(true);
      }
    });
  }
});

// -- single declaration site + no dark mode ---------------------------
//
// Story 14.1 also asserted here that the bundle carried no reset, no `body`
// rule and no bare element selector - the pieces it deferred to Story 14.7.
// 14.7 has landed them (`_base.scss`), so those three assertions are gone and
// `base.spec.ts` owns the base layer's contract instead. What survives is what
// still holds forever: tokens are declared in exactly one `:root` block, and
// no dark-mode / @import / @font-face rule exists.

describe('token declaration site and global scope limits', () => {
  it('declares --uc-* custom properties only inside one single :root block', () => {
    const rootOpeners = [...compiledCss.matchAll(/(^|})\s*:root\s*{/g)];
    expect(rootOpeners.length, 'exactly one :root block expected').toBe(1);

    const rootBody = extractRuleBody(compiledCss, ':root')!;
    const declaredEverywhere = [...compiledCss.matchAll(/--uc-[a-z0-9-]+\s*:/g)].length;
    const declaredInRoot = [...rootBody.matchAll(/--uc-[a-z0-9-]+\s*:/g)].length;
    // A única exceção é a margem de página do celular, dentro do @media (próximo teste).
    expect(declaredInRoot + 1, '--uc-* declared outside the :root block').toBe(declaredEverywhere);
  });

  it('page-margin: 24px no :root e sobrescrita de 16px só no @media do celular', () => {
    const rootBody = extractRuleBody(compiledCss, ':root')!;
    expect(parseCustomProps(rootBody).get('--uc-space-page-margin')).toBe('24px');
    const media = compiledCss.match(/@media \(max-width: 760px\)\s*{\s*:root\s*{([^}]*)}\s*}/);
    expect(media, 'bloco @media (max-width: 760px) com :root ausente').not.toBeNull();
    expect([...parseCustomProps(media![1])]).toEqual([['--uc-space-page-margin', '16px']]);
  });

  it('emits no dark-mode, @import or @font-face at-rule', () => {
    // O único @media permitido é o do celular (max-width), conferido acima; o resto
    // seria um font-face, keyframes, @supports ou @import entrando num parcial global.
    expect(compiledCss.match(/@media[^{]*/g)).toEqual(['@media (max-width: 760px) ']);
    expect(compiledCss).not.toMatch(/@(font-face|keyframes|supports|import)\b/);
    expect(compiledCss).not.toMatch(/prefers-color-scheme/);
  });
});

// -- consumidores dos tokens que saem (KAN-91) -------------------------------

function listarArquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name);
    return e.isDirectory() ? listarArquivos(caminho) : [caminho];
  });
}

describe('consumidores de src/app', () => {
  it('nenhum SCSS, HTML ou TS referencia token ou classe que sai no redesign', () => {
    const appDir = join(stylesDir, '..', 'app');
    const proibido = /orange|label-caps|font-size-question|font-weight-caps|uc-text-question/;
    const ofensores = listarArquivos(appDir)
      .filter((f) => /\.(scss|html|ts)$/.test(f))
      .filter((f) => proibido.test(readFileSync(f, 'utf8')));
    expect(ofensores).toEqual([]);
  });
});
