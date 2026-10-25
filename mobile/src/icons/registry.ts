import type { ComponentType } from 'react';
import type { IconProps } from 'phosphor-react-native';

import { LASO_GLYPHS, type LasoGlyphName } from './glyphs';
import { PHOSPHOR_ICONS, type PhosphorIconKey } from './phosphor';

export const ICON_REGISTRY = {
  ...PHOSPHOR_ICONS,
  ...LASO_GLYPHS,
} as const;

export type IconName = keyof typeof ICON_REGISTRY;

export type IconComponent = ComponentType<IconProps>;

export const isIconName = (name: string): name is IconName =>
  Object.prototype.hasOwnProperty.call(ICON_REGISTRY, name);

export const resolveIconName = (
  name: string | null | undefined,
  fallback: IconName = 'triagePulse'
): IconName => (name && isIconName(name) ? name : fallback);

export const getPhosphorIcon = (name: string): IconComponent | undefined =>
  PHOSPHOR_ICONS[name as PhosphorIconKey];

export const getLasoGlyph = (name: string): ComponentType<{
  size: number;
  color: string;
  strokeWidth: number;
}> | undefined => LASO_GLYPHS[name as LasoGlyphName];

export { LASO_GLYPHS, PHOSPHOR_ICONS };
export type { LasoGlyphName, PhosphorIconKey };
