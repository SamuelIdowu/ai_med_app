// Centralized Medical Design System - Colors
// Dynamically derived from the active preset in themeConfig.ts

import { activeDesignConfig, THEME_PRESETS, STATUS_COLORS } from './themeConfig';

const activePresetData = THEME_PRESETS[activeDesignConfig.activePreset] || THEME_PRESETS.clinicalWarm;
const overrides = activeDesignConfig.customOverrides || {};

export const colors = {
  // 1. Canvas & Surfaces
  canvas: {
    background: overrides.canvasBackground || activePresetData.canvas.background,
    surface: overrides.cardSurface || activePresetData.canvas.surface,
    surfaceSubtle: activePresetData.canvas.surfaceSubtle,
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

  // 4. Clinical Triage States (Strict WCAG AAA)
  status: STATUS_COLORS,

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
  },
  warning: {
    primary: STATUS_COLORS.warning.primary,
    background: STATUS_COLORS.warning.surface,
    border: STATUS_COLORS.warning.border,
    text: STATUS_COLORS.warning.text,
  },
  success: {
    primary: STATUS_COLORS.success.primary,
    background: STATUS_COLORS.success.surface,
    border: STATUS_COLORS.success.border,
    text: STATUS_COLORS.success.text,
  },
  cardSurface: overrides.cardSurface || activePresetData.canvas.surface,
  cardBorder: overrides.cardBorder || activePresetData.canvas.border,
} as const;

export type AppColors = typeof colors;
