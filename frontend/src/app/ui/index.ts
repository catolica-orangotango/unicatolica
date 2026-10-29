// UniCatolica - Campus Clean base visual components (Story 14.2).
//
// Barrel for the four design-system primitives consumed by the feature epics
// (Comunidades, Publicacoes, Enquetes, ...). Each is standalone, `uc-` prefix,
// and its SCSS consumes only `var(--uc-*)` tokens from Story 14.1.
export { UcAvatar, corDoAvatar, type UcAvatarCor } from './avatar/avatar';
export { UcBadge, type UcBadgeVariant } from './badge/badge';
export { UcButton } from './button/button';
export { UcCard } from './card/card';
export { UcIcon, type UcIconName } from './icon/icon';
export { UcMemberIndicator } from './member-indicator/member-indicator';
export { ToastService, type ToastItem } from './toast/toast.service';
export { UcToastHost } from './toast/toast-host';
