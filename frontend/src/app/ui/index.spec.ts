import {
  UcAvatar,
  UcBadge,
  UcButton,
  UcCard,
  UcIcon,
  UcEmptyState,
  UcField,
  UcInput,
  UcMemberIndicator,
  UcNote,
  UcSkeleton,
  corDoAvatar,
  type UcBadgeVariant,
  type UcIconName,
  type UcNoteTom,
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

  it('re-exports UcSkeleton, UcEmptyState, UcNote e o tipo UcNoteTom', () => {
    const tons: UcNoteTom[] = ['neutro', 'alerta', 'erro'];
    expect(UcSkeleton).toBeDefined();
    expect(UcEmptyState).toBeDefined();
    expect(UcNote).toBeDefined();
    expect(tons).toHaveLength(3);
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

  it('re-exports UcField e UcInput', () => {
    expect(UcField).toBeDefined();
    expect(UcInput).toBeDefined();
  });
});
