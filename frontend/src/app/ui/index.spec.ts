import {
  UcAvatar,
  UcBadge,
  UcButton,
  UcCard,
  UcIcon,
  UcMemberIndicator,
  corDoAvatar,
  type UcBadgeVariant,
  type UcIconName,
} from './index';

/**
 * Smoke-tests the barrel: a broken re-export path (a moved folder, a renamed
 * class) would fail this before any consuming epic hits it.
 */
describe('ui barrel (src/app/ui/index.ts)', () => {
  it('re-exports the four base components from their folders', () => {
    expect(UcBadge).toBeDefined();
    expect(UcButton).toBeDefined();
    expect(UcCard).toBeDefined();
    expect(UcMemberIndicator).toBeDefined();
  });

  it('re-exports the UcBadgeVariant union type', () => {
    const variants: UcBadgeVariant[] = ['counter', 'role', 'course', 'open', 'state'];
    expect(variants).toEqual(['counter', 'role', 'course', 'open', 'state']);
  });

  it('re-exports UcIcon, UcAvatar e corDoAvatar', () => {
    const nome: UcIconName = 'home';
    expect(UcIcon).toBeDefined();
    expect(UcAvatar).toBeDefined();
    expect(nome).toBe('home');
    expect(corDoAvatar(5)).toBe('azul');
  });
});
