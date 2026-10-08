/**
 * Story 14.1 - design tokens and typography.
 *
 * Compiled-Sass path only: this spec compiles `src/styles.scss` with the `sass`
 * package and asserts against the produced CSS. There is NO source-text
 * fallback. A `sass` import failure, a compile throw, or a `:root` with zero
 * `--uc-*` custom properties is a hard failure (the frozen I/O matrix demands
 * "Sass compile error -> tokens.spec.ts fails").
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const stylesDir = dirname(fileURLToPath(import.meta.url));
const entryScss = join(stylesDir, '..', 'styles.scss');
const readmePath = join(stylesDir, 'README.md');

/**
 * EXPECTED mirrors DESIGN.md frontmatter (`colors` / `typography` / `rounded` /
 * `spacing`) plus the one prose-sourced token `--uc-shadow-overlay`. It is the
 * contract: the compiled `--uc-*` set must equal this key set exactly.
 */
const EXPECTED: Record<string, Record<string, string>> = {
  colors: {
    '--uc-color-bg': '#FAFAF8',
    '--uc-color-surface': '#FFFFFF',
    '--uc-color-border': '#EAEAE6',
    '--uc-color-ink': '#1C1C1A',
    '--uc-color-ink-soft': '#6B6B66',
    '--uc-color-ink-faint': '#6E6E68',
    '--uc-color-maroon': '#7A1F2B',
    '--uc-color-orange': '#BC4913',
    '--uc-color-orange-tint': '#FDEEE6',
    '--uc-color-green-ok': '#3A7D5C',
    // Added in Story 14.7 and escalated back into DESIGN.md `colors.error`
    // before landing here (see _tokens.scss header).
    '--uc-color-error': '#B3261E',
  },
  typography: {
    '--uc-font-family-base':
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    '--uc-font-size-greeting': '22px',
    '--uc-font-size-question': '15px',
    '--uc-font-size-body': '13.5px',
    '--uc-font-size-meta': '12px',
    '--uc-font-size-label-caps': '10.5px',
    '--uc-font-weight-regular': '400',
    '--uc-font-weight-semibold': '600',
    '--uc-font-weight-caps': '700',
    '--uc-line-height-body': '1.5',
    '--uc-letter-spacing-greeting': '-0.01em',
    '--uc-letter-spacing-label-caps': '0.05em',
  },
  spacing: {
    '--uc-space-unit': '4px',
    '--uc-space-card-padding': '18px',
    '--uc-space-section-gap': '20px',
    '--uc-space-page-margin': '32px',
  },
  rounded: {
    '--uc-radius-sm': '6px',
    '--uc-radius-default': '8px',
    '--uc-radius-md': '12px',
    '--uc-radius-lg': '14px',
    '--uc-radius-full': '9999px',
  },
  shadow: {
    '--uc-shadow-overlay': '0 8px 24px rgba(0, 0, 0, 0.08)',
  },
};

const EXPECTED_KEYS = Object.values(EXPECTED)
  .flatMap((group) => Object.keys(group))
  .sort();

const TEXT_ROLES = ['greeting', 'question', 'body', 'meta', 'label-caps'] as const;

/**
 * The exact declaration set each `.uc-text-*` class must carry, per DESIGN.md
 * `typography`: font-size + font-weight for every role, line-height only for
 * `body`, letter-spacing only for `greeting` and `label-caps`. Nothing else --
 * no `font-family`, no `text-transform`. Values are `var(--uc-*)` references
 * whose names must resolve against the compiled `:root` token set.
 */
const ROLE_DECLS: Record<string, Record<string, string>> = {
  greeting: {
    'font-size': 'var(--uc-font-size-greeting)',
    'font-weight': 'var(--uc-font-weight-semibold)',
    'letter-spacing': 'var(--uc-letter-spacing-greeting)',
  },
  question: {
    'font-size': 'var(--uc-font-size-question)',
    'font-weight': 'var(--uc-font-weight-semibold)',
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
  'label-caps': {
    'font-size': 'var(--uc-font-size-label-caps)',
    'font-weight': 'var(--uc-font-weight-caps)',
    'letter-spacing': 'var(--uc-letter-spacing-label-caps)',
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
      it(`${name} is present with the DESIGN.md value`, () => {
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
    it(`.uc-text-${role} sets exactly the DESIGN.md property set, values only var(--uc-*)`, () => {
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
    expect(declaredInRoot, '--uc-* declared outside the :root block').toBe(declaredEverywhere);
  });

  it('emits no dark-mode, @import or @font-face at-rule', () => {
    // @media covers prefers-color-scheme; the rest would mean a font-face,
    // keyframes, @supports gate or an @import crept into a global partial.
    expect(compiledCss).not.toMatch(/@(media|font-face|keyframes|supports|import)\b/);
    expect(compiledCss).not.toMatch(/prefers-color-scheme/);
  });
});
