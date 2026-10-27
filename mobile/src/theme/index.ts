import './fontPatch';
export * from './themeConfig';
export * from './colors';
export * from './typography';
export * from './spatial';
export * from './ThemeContext';
export * from './icons';

import { colors } from './colors';
import { typography } from './typography';
import { spatial } from './spatial';
import { iconSizes, iconTokens } from './icons';

export const theme = {
  colors,
  typography,
  spatial,
  spacing: spatial.spacing,
  radii: spatial.radii,
  shadows: spatial.shadows,
  shadows3d: spatial.shadows3d,
  glassmorphism: spatial.glassmorphism,
  icon: iconTokens,
  icons: iconSizes,
} as const;

export type Theme = typeof theme;
export default theme;

