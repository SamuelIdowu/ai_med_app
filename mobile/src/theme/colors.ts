// Centralized Medical Design System - Colors
// Dynamically derived from the active preset in themeConfig.ts

import { activeDesignConfig, THEME_PRESETS, STATUS_COLORS, BRAND_PALETTE } from './themeConfig';

export const palette = BRAND_PALETTE;

const activePresetData = THEME_PRESETS[activeDesignConfig.activePreset] || THEME_PRESETS.coralTeal;
const overrides = activeDesignConfig.customOverrides || {};

// Neutral ramp: value-preserving tokens for the gray scale previously hardcoded
// across screens. Centralized here so preset authors can override or remap later.
export const ramp = {
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  slate300: '#CBD5E1',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  slate900: '#0F172A',
  ink: '#0F1115',
  inkElev: '#262A33',
  inkDim: '#1F242D',
  inkDeep: '#111318',
  charcoal: '#171717',
  nightDark: '#0B0F19',
  black: '#000000',
} as const;

/**
 * Converts a hex color string to rgba() with the given alpha.
 * Used by screens that need alpha overlays derived from theme tokens.
 */
export function withAlpha(hexColor: string, alpha: number): string {
  const clean = hexColor.replace('#', '');
  const value =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.slice(0, 6);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const colors = {
  // Brand Swatch Named Aliases
  palette: BRAND_PALETTE,
  coralCoast: BRAND_PALETTE.coralCoast,
  eliteTeal: BRAND_PALETTE.eliteTeal,
  petroBlue: BRAND_PALETTE.petroBlue,
  pompeiiAsh: BRAND_PALETTE.pompeiiAsh,
  blissfulBlue: BRAND_PALETTE.blissfulBlue,
  darkSideMoon: BRAND_PALETTE.darkSideMoon,

  // 1. Canvas & Surfaces
  canvas: {
    background: overrides.canvasBackground || activePresetData.canvas.background,
    surface: overrides.cardSurface || activePresetData.canvas.surface,
    surfaceSubtle: activePresetData.canvas.surfaceSubtle,
    subtle: activePresetData.canvas.surfaceSubtle,
    border: overrides.cardBorder || activePresetData.canvas.border,
    borderFocus: activePresetData.canvas.borderFocus,
  },

  // 2. Primary Brand
  primary: {
    main: overrides.primaryMain || activePresetData.primary.main,
    hover: activePresetData.primary.hover,
    light: activePresetData.primary.light,
    border: activePresetData.primary.border,
  },

  // 3. Navigation Dark Pill
  navPill: activePresetData.navPill,

  // 4. Clinical Triage States (Strict WCAG AAA, Vivid Red for Emergency)
  status: {
    ...STATUS_COLORS,
    danger: STATUS_COLORS.emergency.primary,
  },

  // 5. Typography & High-Contrast Neutrals
  text: activePresetData.text,

  // 6. Clinical Charts
  chart: activePresetData.chart,

  // Backwards compatibility aliases for existing code
  emergency: {
    primary: STATUS_COLORS.emergency.primary,
    background: STATUS_COLORS.emergency.surface,
    border: STATUS_COLORS.emergency.border,
    text: STATUS_COLORS.emergency.text,
    glow: STATUS_COLORS.emergency.glow,
  },
  warning: {
    primary: STATUS_COLORS.warning.primary,
    background: STATUS_COLORS.warning.surface,
    border: STATUS_COLORS.warning.border,
    text: STATUS_COLORS.warning.text,
    glow: STATUS_COLORS.warning.glow,
  },
  success: {
    primary: STATUS_COLORS.success.primary,
    background: STATUS_COLORS.success.surface,
    border: STATUS_COLORS.success.border,
    text: STATUS_COLORS.success.text,
    glow: STATUS_COLORS.success.glow,
  },
  info: {
    primary: STATUS_COLORS.info.primary,
    background: STATUS_COLORS.info.surface,
    border: STATUS_COLORS.info.border,
    text: STATUS_COLORS.info.text,
    glow: STATUS_COLORS.info.glow,
  },
  cardSurface: overrides.cardSurface || activePresetData.canvas.surface,
  cardBorder: overrides.cardBorder || activePresetData.canvas.border,
  ramp,
} as const;

export type AppColors = typeof colors;
