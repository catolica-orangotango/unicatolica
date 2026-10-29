// UniCatolica - design system do redesign (Story 14.2, ampliado na KAN-91).
//
// Barrel de todos os componentes do design system (avatar, badge, button, card,
// field/input, icon, empty-state, menu, member-indicator, note, segmented,
// skeleton, toast) consumidos pelas telas. Cada um é standalone, com prefixo
// `uc-`, e seu SCSS consome só `var(--uc-*)` dos tokens de styles/_tokens.scss.
export { UcAvatar, corDoAvatar, type UcAvatarCor } from './avatar/avatar';
export { UcBadge, type UcBadgeVariant } from './badge/badge';
export { UcButton } from './button/button';
export { UcCard } from './card/card';
export { UcField } from './field/field';
export { UcInput } from './field/input';
export { UcIcon, type UcIconName } from './icon/icon';
export { UcEmptyState } from './empty-state/empty-state';
export { UcMenu, type UcMenuItem } from './menu/menu';
export { UcMemberIndicator, type UcMemberIndicatorEstado } from './member-indicator/member-indicator';
export { UcNote, type UcNoteTom } from './note/note';
export { UcSegmented, type UcSegmentedOpcao } from './segmented/segmented';
export { UcSkeleton } from './skeleton/skeleton';
export {
  ToastService,
  type ToastAcao,
  type ToastItem,
  type ToastOpcoes,
  type ToastTipo,
} from './toast/toast.service';
export { UcToastHost } from './toast/toast-host';
