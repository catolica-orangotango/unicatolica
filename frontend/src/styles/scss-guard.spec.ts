/**
 * Story 14.7 - no-hardcode SCSS guard for EVERY stylesheet in the app.
 *
 * Supersedes and deletes `src/app/ui/ui-styles.spec.ts` (Story 14.2), which
 * applied these same rules to `src/app/ui/**` only. This file applies them to a
 * strict superset - `src/app/**\/*.scss` plus `src/styles/*.scss` - so the
 * "no hardcoded design value anywhere" rule of epic 14 is enforceable instead
 * of aspirational. Keeping both files would mean two copies of the parser
 * drifting apart, so there is exactly one.
 *
 * A declaration fails on:
 *  - a hex colour literal anywhere;
 *  - a raw length literal (`px` / `rem` / `em` / `vh` / `vw` / `vmin` / `vmax` /
 *    `%`) in a sizing declaration (`font-size`, `line-height`, `padding*`,
 *    `margin*`, `gap`, `width`/`height` and their min/max, `border-radius`,
 *    `inset` / `top` / `right` / `bottom` / `left`) - these must be `var(--uc-*)`
 *    tokens, optionally composed with `calc()`;
 *  - a `color` / `background` / `background-color` / `border-color` value that
 *    is neither a bare `var(--uc-*)` reference, nor one of the non-colour
 *    keywords `transparent` / `none` / `currentColor` / `inherit`, nor an
 *    all-token gradient (see below);
 *  - a `font-weight` / `letter-spacing` / `font-family` value that is not a bare
 *    `var(--uc-*)` reference (new in 14.7: a weight must come from a
 *    `--uc-font-weight-*` token, so a bare `font-weight: 700` is a real drift);
 *  - a named colour, `rgb(...)` or `hsl(...)` inside a `border` / `outline` /
 *    `box-shadow` / `fill` / `stroke` shorthand;
 *  - a `var(--uc-*)` reference to a token `_tokens.scss` does not declare
 *    (typo / stale rename - this is what caught `var(--lista-ink)`).
 *
 * Two allowances the wider glob requires:
 *  - GRADIENT: a `linear-` / `radial-` / `conic-gradient(...)` whose colour
 *    stops are all `var(--uc-*)` is a valid background. Feature screens legally
 *    compose two tokens into one avatar gradient.
 *  - `// layout-literal: <reason>`: app screens legitimately need structural
 *    dimensions DESIGN.md itself writes as "~" and defers (a 220px sidebar, a
 *    720px reading column, a `minmax()` grid track, `width: 100%`).
 *
 * The marker is deliberately NARROW, in two ways:
 *  - It exempts a declaration from the SIZING rule only. A hex, a non-token
 *    colour, a non-token font value, a colour inside a shorthand and an unknown
 *    `--uc-*` still fail on a marked line - the spec's acceptance criterion
 *    reads "no hex literal, no raw sizing length without a `// layout-literal:`
 *    reason", so a structural dimension is the only thing it can buy.
 *  - A marker on its own line covers that line and the one directly below it
 *    (the usual "comment above the declaration" shape). A marker written as a
 *    TRAILING comment covers only its own declaration, so annotating one line
 *    cannot silently license the next.
 * An empty or missing reason registers nothing, so the declaration it was meant
 * to cover still fails and the hatch stays visible and auditable.
 *
 * Structural literals that were never design values need no marker and are
 * allowed as before: `1px` / `2px` borders and outlines, `0`, unitless
 * `opacity` / `z-index` / `flex`.
 *
 * Two files get a narrow exemption, each for a structural reason:
 *  - `styles/_tokens.scss` is the declaration site the "unknown token" rule
 *    validates against - its `--uc-*: #hex` lines ARE the palette;
 *  - a stylesheet with zero declarations (an empty placeholder) is skipped by
 *    the "must reference a token" rule; there is nothing in it to hardcode.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const stylesDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(stylesDir, '..');
const appDir = join(srcDir, 'app');

/** POSIX-style path relative to `src/`, used in every failure message. */
const rel = (file: string): string => relative(srcDir, file).split(sep).join('/');

function scssUnder(dir: string, recursive: boolean): string[] {
  return readdirSync(dir, { recursive, encoding: 'utf8' })
    .filter((entry) => entry.endsWith('.scss'))
    .map((entry) => join(dir, entry));
}

/**
 * Every stylesheet the guard covers: all of `src/app/**`, all of `src/styles/*`
 * and `src/styles.scss` itself - the build entry point named in `angular.json`,
 * which lives in `src/` and would otherwise fall outside both globs.
 */
const scssFiles = [
  ...scssUnder(appDir, true),
  ...scssUnder(stylesDir, false),
  join(srcDir, 'styles.scss'),
].sort();

// -- line-aware parsing ------------------------------------------------------

/** Replace every comment with spaces, preserving length and line breaks. */
function blankComments(scss: string): string {
  const blank = (text: string) => text.replace(/[^\n]/g, ' ');
  return scss
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead: string) => lead + blank(_m.slice(lead.length)));
}

/**
 * The `--uc-*` names `_tokens.scss` actually declares. Comments are blanked
 * first: a commented-out token must NOT satisfy the unknown-token rule, or
 * retiring a token by commenting it out would leave every consumer green.
 */
const TOKEN_SOURCE = 'styles/_tokens.scss';
const declaredTokens = new Set(
  [
    ...blankComments(readFileSync(join(stylesDir, '_tokens.scss'), 'utf8')).matchAll(
      /(--uc-[a-z0-9-]+)\s*:/g,
    ),
  ].map((m) => m[1]),
);

interface Declaration {
  prop: string;
  value: string;
  /** 1-based line of the declaration's property name. */
  line: number;
}

/**
 * Split a stylesheet into `prop: value` declarations, each tagged with the line
 * its property sits on. Story 14.2's parser used `split(/[;{}]/)`, which throws
 * the line numbers away - and the `// layout-literal:` exemption needs them.
 */
function parseDeclarations(scss: string): Declaration[] {
  const code = blankComments(scss);
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (offset: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const out: Declaration[] = [];
  let start = 0;
  const flush = (end: number): void => {
    const chunk = code.slice(start, end);
    start = end + 1;
    const m = chunk.match(/^\s*((?:--)?[a-z][a-z-]*)\s*:\s*([\s\S]+?)\s*$/i);
    if (!m) return;
    out.push({
      prop: m[1].toLowerCase(),
      value: m[2].replace(/\s+/g, ' ').trim(),
      line: lineOf(start - 1 - chunk.length + chunk.indexOf(m[1])),
    });
  };
  for (let i = 0; i < code.length; i++)
    if (code[i] === '{' || code[i] === '}' || code[i] === ';') flush(i);
  flush(code.length);
  return out;
}

/**
 * Lines whose SIZING rule a `// layout-literal: <reason>` marker waives.
 *
 * A marker on its own line covers that line and the one directly below it (the
 * "comment above the declaration" shape). A TRAILING marker - one with code
 * before it on the same line - covers only its own line, so annotating
 * `min-height: 100vh` cannot silently license the `min-height: 100dvh` under
 * it. A marker with an empty reason registers nothing.
 */
function exemptLines(scss: string): Set<number> {
  const out = new Set<number>();
  scss.split('\n').forEach((text, index) => {
    const marker = /\/\/\s*layout-literal:\s*\S/.exec(text);
    if (!marker) return;
    out.add(index + 1);
    if (text.slice(0, marker.index).trim() === '') out.add(index + 2);
  });
  return out;
}

// -- rules -------------------------------------------------------------------

const HEX = /#[0-9a-fA-F]{3,8}\b/;
// The trailing guard is a negative lookahead, NOT `\b`. Story 14.2's regex ended
// in `\b`, which can never match after `%`: both `%` and the `;` that follows are
// non-word characters, so no word boundary exists there and every percentage
// length slipped past the sizing rule. `(?![\w%-])` matches at end-of-unit in
// both cases while still rejecting `100dvh` / `1pxy`.
// Absolute (px/pt/pc/cm/mm/Q/in), font-relative (rem/em/ex/ch), the classic
// viewport units and the dynamic/small/large families (dvh, svw, lvmax, dvb...),
// plus percentages. Anything expressing a size must be a token.
const LENGTH_LITERAL =
  /\b\d*\.?\d+(px|pt|pc|cm|mm|q|in|rem|em|ex|ch|[dsl]v(h|w|min|max|b|i)|vh|vw|vmin|vmax|%)(?![\w%-])/i;
// Physical and logical box properties, both shorthand and per-side.
const SIZE_PROP =
  /^(font-size|line-height|border-radius|flex-basis|(row|column)-gap|gap|(padding|margin|inset)(-(top|right|bottom|left|inline|block))?(-(start|end))?|(min-|max-)?(width|height|inline-size|block-size)|top|right|bottom|left)$/;
const COLOUR_PROP =
  /^(color|background|background-color|border-color|border-(top|right|bottom|left|inline|block)(-(start|end))?-color|outline-color|text-decoration-color|column-rule-color|caret-color|accent-color)$/;
const FONT_PROP = /^(font|font-weight|letter-spacing|font-family)$/;
const BARE_UC_VAR = /^var\(\s*--uc-[a-z0-9-]+\s*\)$/;
const SHORTHAND_COLOUR_PROP =
  /^(border|border-(top|right|bottom|left|inline|block)(-(start|end))?|outline|box-shadow|text-shadow|column-rule|fill|stroke)$/;

/** Non-colour values a colour property may carry instead of a token. */
const COLOUR_KEYWORDS = new Set(['transparent', 'none', 'currentcolor', 'inherit']);

/**
 * CSS-wide keywords a font property may carry instead of a token. `font:
 * inherit` is how a form control picks up the document font the base layer set
 * from tokens - it introduces no design value. `normal` is NOT here: it is
 * weight 400 spelled as a word, i.e. a design value that belongs in a token.
 */
const FONT_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert']);

/** Non-colour sub-tokens allowed inside a border / outline / shadow shorthand. */
const SHORTHAND_KEYWORDS = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
  'none',
  'hidden',
  'currentcolor',
  'transparent',
  'thin',
  'medium',
  'thick',
]);

/** Geometry keywords a gradient may carry alongside its colour stops. */
const GRADIENT_KEYWORDS = new Set([
  'to',
  'top',
  'bottom',
  'left',
  'right',
  'at',
  'in',
  'circle',
  'ellipse',
  'closest-side',
  'closest-corner',
  'farthest-side',
  'farthest-corner',
  'from',
]);

/**
 * True for a gradient whose every colour stop is a `var(--uc-*)` token: the
 * geometry (angle, stop positions, `to bottom`) may be literal, the colours may
 * not. Anything that is not a gradient returns false and falls through to the
 * ordinary "bare token" requirement.
 */
function allTokenGradient(value: string): boolean {
  const m = value.match(/^(?:repeating-)?(?:linear|radial|conic)-gradient\(([\s\S]*)\)$/i);
  if (!m) return false;
  const rest = m[1].replace(/var\(\s*--uc-[a-z0-9-]+\s*\)/gi, ' ');
  if (HEX.test(rest) || /\b(rgba?|hsla?|color-mix|color)\(/i.test(rest)) return false;
  for (const tok of rest.split(/[\s,]+/).filter(Boolean)) {
    if (/^-?\.?\d/.test(tok)) continue; // 135deg, 50%, 0
    if (!GRADIENT_KEYWORDS.has(tok.toLowerCase())) return false; // a bare colour word
  }
  return true;
}

function colourOffender(value: string): boolean {
  if (BARE_UC_VAR.test(value)) return false;
  if (COLOUR_KEYWORDS.has(value.toLowerCase())) return false;
  return !allTokenGradient(value);
}

/** A font property must be a bare token or a CSS-wide inheritance keyword. */
function fontOffender(value: string): boolean {
  return !BARE_UC_VAR.test(value) && !FONT_KEYWORDS.has(value.toLowerCase());
}

/**
 * True when a border / outline / box-shadow / fill / stroke value carries a
 * colour that is not a `var(--uc-*)` token: `rgb(...)` / `hsl(...)`, or a bare
 * word that is not a recognised non-colour keyword (e.g. `maroon`, `black`).
 * `#hex` is caught separately by the file-wide hex check.
 */
function shorthandColourOffender(value: string): boolean {
  if (/\b(rgba?|hsla?)\(/i.test(value)) return true;
  const stripped = value
    .replace(/var\(\s*--uc-[a-z0-9-]+\s*\)/gi, ' ')
    .replace(/calc\([^()]*(?:\([^()]*\)[^()]*)*\)/gi, ' ');
  for (const tok of stripped.split(/[\s,/]+/).filter(Boolean)) {
    if (/^-?\.?\d/.test(tok)) continue; // lengths / numbers
    if (/^[a-z]+$/i.test(tok) && !SHORTHAND_KEYWORDS.has(tok.toLowerCase())) return true;
  }
  return false;
}

// -- suite -------------------------------------------------------------------

describe('src/app/**/*.scss + src/styles/*.scss - no hardcoded design values', () => {
  it('discovers every stylesheet in the app, not just src/app/ui', () => {
    const names = scssFiles.map(rel);
    expect(names.length).toBeGreaterThanOrEqual(10);
    // One representative per area the glob must reach, so a broken glob fails
    // here instead of leaving the whole suite vacuously green.
    expect(names).toContain('app/layout/shell/shell.scss');
    expect(names).toContain('app/features/feed/feed.scss');
    expect(names).toContain('styles.scss'); // the angular.json build entry point
    expect(names).toContain(TOKEN_SOURCE);
    expect(
      names.filter((name) => name.startsWith('app/ui/')).length,
      'the Story 14.2 component stylesheets must still be covered',
    ).toBeGreaterThanOrEqual(4);
  });

  it('reads the token declarations from _tokens.scss', () => {
    expect(declaredTokens.size).toBeGreaterThan(10);
  });

  for (const file of scssFiles) {
    const name = rel(file);
    const scss = readFileSync(file, 'utf8');
    const exempt = exemptLines(scss);
    const isTokenSource = name === TOKEN_SOURCE;
    // In the token source the `--uc-*: <literal>` lines are the palette itself;
    // every other rule still applies to it. NOTE the `// layout-literal:`
    // exemption is NOT applied here - it is scoped to the sizing rule alone,
    // below, so a marked line still answers to every colour / font rule.
    const decls = parseDeclarations(scss).filter(
      (d) => !(isTokenSource && d.prop.startsWith('--uc-')),
    );
    const offenders = (predicate: (d: Declaration) => boolean): string[] =>
      decls.filter(predicate).map((d) => `L${d.line} ${d.prop}: ${d.value}`);

    describe(name, () => {
      it('references at least one var(--uc-*) token', () => {
        if (isTokenSource || parseDeclarations(scss).length === 0) return;
        expect(blankComments(scss), `${name} - styled with zero tokens`).toMatch(/var\(\s*--uc-/);
      });

      it('has no hex colour literal', () => {
        const bad = offenders((d) => HEX.test(d.value));
        expect(bad, `${name} - hex literal in ${bad.join(' | ')}`).toEqual([]);
      });

      // The one rule `// layout-literal:` can waive, and only on a marked line.
      it('uses only var(--uc-*) tokens for sizing (no px / rem / em / % literal)', () => {
        const bad = offenders(
          (d) => SIZE_PROP.test(d.prop) && LENGTH_LITERAL.test(d.value) && !exempt.has(d.line),
        );
        expect(bad, `${name} - length literal in ${bad.join(' | ')}`).toEqual([]);
      });

      it('uses only tokens (or an all-token gradient) for colour / background / border-color', () => {
        const bad = offenders((d) => COLOUR_PROP.test(d.prop) && colourOffender(d.value));
        expect(bad, `${name} - non-token colour in ${bad.join(' | ')}`).toEqual([]);
      });

      it('uses only var(--uc-*) tokens for font / font-weight / letter-spacing / font-family', () => {
        const bad = offenders((d) => FONT_PROP.test(d.prop) && fontOffender(d.value));
        expect(bad, `${name} - non-token font value in ${bad.join(' | ')}`).toEqual([]);
      });

      it('uses only tokens / currentColor / transparent / none for border / outline / shadow colours', () => {
        const bad = offenders(
          (d) => SHORTHAND_COLOUR_PROP.test(d.prop) && shorthandColourOffender(d.value),
        );
        expect(bad, `${name} - hardcoded colour in ${bad.join(' | ')}`).toEqual([]);
      });

      it('references only --uc-* tokens that _tokens.scss declares', () => {
        const unknown = [
          ...new Set(
            [...blankComments(scss).matchAll(/var\(\s*(--uc-[a-z0-9-]+)\s*\)/g)].map((m) => m[1]),
          ),
        ].filter((token) => !declaredTokens.has(token));
        expect(unknown, `${name} - unknown token(s): ${unknown.join(', ')}`).toEqual([]);
      });
    });
  }
});

// -- the parser and the escape hatch themselves ------------------------------

describe('guard mechanics', () => {
  it('tags each declaration with its own line number', () => {
    const decls = parseDeclarations('.a {\n  color: red;\n}\n\n.b {\n  gap: 4px;\n}\n');
    expect(decls).toEqual([
      { prop: 'color', value: 'red', line: 2 },
      { prop: 'gap', value: '4px', line: 6 },
    ]);
  });

  it('ignores declarations that live inside a comment', () => {
    expect(parseDeclarations('.a {\n  // color: red;\n  /* gap: 4px; */\n}\n')).toEqual([]);
  });

  it('exempts the marker line and the line directly below it', () => {
    const scss = '.a {\n  // layout-literal: coluna de leitura\n  max-width: 720px;\n}\n';
    expect([...exemptLines(scss)].sort((x, y) => x - y)).toEqual([2, 3]);
  });

  it('a TRAILING marker exempts only its own line, never the next one', () => {
    // The shape that matters: annotating the `100vh` fallback must not license
    // whatever happens to sit on the line under it.
    const scss =
      '.a {\n  min-height: 100vh; // layout-literal: fallback sem dvh\n  gap: 13px;\n}\n';
    expect([...exemptLines(scss)]).toEqual([2]);
  });

  it('does not exempt anything when the reason is empty', () => {
    expect(exemptLines('.a {\n  // layout-literal:\n  max-width: 720px;\n}\n').size).toBe(0);
  });

  it('exempts ONLY the sizing rule: a hex under a marker still fails', () => {
    const scss = '.a {\n  // layout-literal: motivo qualquer\n  color: #ff0000;\n}\n';
    const exempt = exemptLines(scss);
    const [decl] = parseDeclarations(scss);

    // What the marker is for (sizing) is waived on that line...
    expect(exempt.has(decl.line)).toBe(true);
    // ...but the colour rules keep firing on exactly the same declaration.
    expect(HEX.test(decl.value)).toBe(true);
    expect(COLOUR_PROP.test(decl.prop) && colourOffender(decl.value)).toBe(true);
  });

  it('accepts a gradient whose stops are all tokens and rejects one that is not', () => {
    expect(
      colourOffender('linear-gradient(135deg, var(--uc-color-orange), var(--uc-color-maroon))'),
    ).toBe(false);
    expect(colourOffender('linear-gradient(135deg, var(--uc-color-orange), white)')).toBe(true);
    expect(colourOffender('linear-gradient(135deg, var(--uc-color-orange), #7A1F2B)')).toBe(true);
  });

  it('accepts transparent / none / currentColor but not a raw colour word', () => {
    expect(colourOffender('transparent')).toBe(false);
    expect(colourOffender('none')).toBe(false);
    expect(colourOffender('var(--uc-color-ink)')).toBe(false);
    expect(colourOffender('red')).toBe(true);
    expect(colourOffender('rgba(255, 255, 255, 0.4)')).toBe(true);
  });

  // The per-file suites above can only prove the ABSENCE of an offender. These
  // prove each detector actually fires, so a regex that silently stops matching
  // (as the `%` one did) fails here instead of turning the whole guard green.

  it('detects a hex literal', () => {
    expect(HEX.test('#B3261E')).toBe(true);
    expect(HEX.test('1px solid var(--uc-color-border)')).toBe(false);
  });

  it('detects every raw length unit, percentages and dynamic viewport units included', () => {
    for (const value of [
      '12px',
      '1.5rem',
      '2em',
      '3ex',
      '4ch',
      '11pt',
      '1pc',
      '2cm',
      '10mm',
      '4q',
      '1in',
      '100vh',
      '50vw',
      '10vmin',
      '10vmax',
      '100dvh',
      '50svw',
      '30lvmax',
      '20dvb',
      '100%',
    ]) {
      expect(LENGTH_LITERAL.test(value), value).toBe(true);
    }
    expect(LENGTH_LITERAL.test('calc(100% + var(--uc-space-unit))')).toBe(true);
    for (const value of ['0', 'var(--uc-space-page-margin)', 'inherit', '1fr', 'auto']) {
      expect(LENGTH_LITERAL.test(value), value).toBe(false);
    }
  });

  it('covers logical box properties and flex-basis, not just the physical ones', () => {
    for (const prop of [
      'padding-inline',
      'margin-block-end',
      'inset-inline-start',
      'min-inline-size',
      'max-block-size',
      'flex-basis',
      'row-gap',
    ]) {
      expect(SIZE_PROP.test(prop), prop).toBe(true);
    }
  });

  it('covers per-side border colours and the other colour properties', () => {
    for (const prop of [
      'border-top-color',
      'border-inline-start-color',
      'outline-color',
      'text-decoration-color',
      'caret-color',
      'accent-color',
    ]) {
      expect(COLOUR_PROP.test(prop), prop).toBe(true);
    }
    for (const prop of ['border-right', 'border-block-end', 'text-shadow', 'column-rule']) {
      expect(SHORTHAND_COLOUR_PROP.test(prop), prop).toBe(true);
    }
  });

  it('detects a non-token font value, including the `font` shorthand', () => {
    expect(FONT_PROP.test('font-weight') && fontOffender('700')).toBe(true);
    expect(FONT_PROP.test('font') && fontOffender('600 13.5px/1.5 Arial')).toBe(true);
    expect(FONT_PROP.test('font-family') && fontOffender('system-ui, sans-serif')).toBe(true);
    // `normal` is weight 400 spelled as a word - still a design value.
    expect(fontOffender('normal')).toBe(true);
    // Inheriting the document font introduces no value of its own.
    expect(fontOffender('inherit')).toBe(false);
    expect(fontOffender('var(--uc-font-weight-semibold)')).toBe(false);
  });

  it('detects a reference to a token _tokens.scss does not declare', () => {
    expect(declaredTokens.has('--uc-color-ink')).toBe(true);
    expect(declaredTokens.has('--lista-ink')).toBe(false);
    expect(declaredTokens.has('--uc-color-inexistente')).toBe(false);
  });

  it('does not count a commented-out token as declared', () => {
    const fonte = ':root {\n  --uc-color-vivo: #000000;\n  // --uc-color-morto: #000000;\n}\n';
    const nomes = [...blankComments(fonte).matchAll(/(--uc-[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    expect(nomes).toEqual(['--uc-color-vivo']);
  });

  it('detects a hardcoded colour inside a border / shadow shorthand', () => {
    expect(shorthandColourOffender('1px solid var(--uc-color-border)')).toBe(false);
    expect(shorthandColourOffender('1px solid currentColor')).toBe(false);
    expect(shorthandColourOffender('1px solid rgba(255, 255, 255, 0.4)')).toBe(true);
    expect(shorthandColourOffender('1px solid maroon')).toBe(true);
  });
});
