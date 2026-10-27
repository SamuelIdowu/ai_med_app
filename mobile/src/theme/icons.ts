// Icon design tokens — single source of truth for icon sizing and stroke weight.

export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
} as const;

export type IconSizeName = keyof typeof iconSizes;

export const iconTokens = {
  size: iconSizes,
  strokeWidth: 1.75,
  strokeWidthBold: 2.25,
} as const;
