import './fontPatch';
export * from './themeConfig';
export * from './colors';
export * from './typography';
export * from './spatial';

import { colors } from './colors';
import { typography } from './typography';
import { spatial } from './spatial';

export const theme = {
  colors,
  typography,
  spatial,
  spacing: spatial.spacing,
  radii: spatial.radii,
  shadows: spatial.shadows,
} as const;

export type Theme = typeof theme;
export default theme;
