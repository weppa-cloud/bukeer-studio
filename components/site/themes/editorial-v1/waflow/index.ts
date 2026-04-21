/**
 * editorial-v1 WAFlow — Barrel.
 *
 * Public exports for the WhatsApp Flow wizard (variants A / B / D).
 * Consumers (layout, hero CTAs, destination cards, package stickies)
 * should import from here rather than deep paths so file re-orgs inside
 * the `waflow/` tree don't ripple.
 */

export { WaflowProvider, useWaflow } from './provider';
export type { WaflowProviderProps } from './provider';
export { WaflowFab } from './fab';
export { WaflowDrawer } from './drawer';
export { WaflowCTAButton } from './cta-button';
export type { WaflowCTAButtonProps } from './cta-button';
export type {
  WaflowConfig,
  WaflowContextValue,
  WaflowCountry,
  WaflowDestinationContext,
  WaflowPackageContext,
  WaflowState,
  WaflowStep,
  WaflowVariant,
} from './types';
export {
  WAFLOW_BASE_INTERESTS,
  WAFLOW_COUNTRIES,
  WAFLOW_DEST_INTERESTS,
  WAFLOW_STEP_ORDER,
  WAFLOW_WHEN_OPTIONS,
  WAFLOW_PKG_ADJUST,
} from './types';
export {
  buildQuickSkipMessage,
  buildWaflowMessage,
  buildWaflowUrl,
  makeWaflowRef,
  resolveRefPrefix,
  validateWaflowPhone,
} from './message';
