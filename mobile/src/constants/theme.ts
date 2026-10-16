/**
 * @deprecated Legacy theme constants file.
 * Use `import { theme } from '../theme';` instead for centralized 3D and glassmorphic tokens.
 */
import { theme } from '../theme';

export const COLORS = {
  primary: theme.colors.primary.main,
  secondary: theme.colors.text.secondary,
  background: theme.colors.canvas.background,
  inputBackground: theme.colors.canvas.surfaceSubtle,
  textPrimary: theme.colors.text.primary,
  textSecondary: theme.colors.text.secondary,
  placeholder: theme.colors.text.muted,
  white: '#FFFFFF',
  black: theme.colors.text.primary,
  lightGray: theme.colors.canvas.surfaceSubtle,
  gray: theme.colors.text.muted,
  error: theme.colors.status.emergency.primary,
  gradientStart: theme.colors.canvas.background,
  gradientEnd: theme.colors.canvas.surfaceSubtle,
};

export const SIZES = {
  base: theme.spatial.spacing.sm,
  small: 12,
  font: 14,
  medium: theme.spatial.spacing.md,
  large: 18,
  extraLarge: theme.spatial.spacing.lg,
  padding: 10,
  radius: theme.spatial.radii.sm,
  h1: 30,
  h2: 22,
  h3: 20,
  h4: 18,
  body1: 30,
  body2: 20,
  body3: 16,
  body4: 14,
  width: 0,
  height: 0,
};

export const SHADOWS = {
  light: theme.spatial.shadows.sm,
  medium: theme.spatial.shadows.md,
  dark: theme.spatial.shadows.lg,
  card3d: theme.spatial.shadows3d.card3d,
  floating3d: theme.spatial.shadows3d.floating3d,
};

const appTheme = { COLORS, SIZES, SHADOWS, theme };

export default appTheme;
