import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import {
  ThemePreset,
  THEME_PRESETS,
  STATUS_COLORS,
  BRAND_PALETTE,
  activeDesignConfig,
} from './themeConfig';
import { typography } from './typography';
import { spatial } from './spatial';

export interface ThemeContextValue {
  theme: {
    colors: any;
    typography: typeof typography;
    spatial: typeof spatial;
    spacing: typeof spatial.spacing;
    radii: typeof spatial.radii;
    shadows: typeof spatial.shadows;
    shadows3d: typeof spatial.shadows3d;
    glassmorphism: typeof spatial.glassmorphism;
    isDark: boolean;
    preset: ThemePreset;
  };
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;
  isDark: boolean;
  toggleDark: () => void;
}

const buildTheme = (preset: ThemePreset, isDarkManual?: boolean) => {
  const isDark = isDarkManual !== undefined ? isDarkManual : preset === 'midnightDark';
  const effectivePreset = isDark && preset !== 'midnightDark' ? 'midnightDark' : preset;
  const presetData = THEME_PRESETS[effectivePreset] || THEME_PRESETS.coralTeal;

  const colors = {
    palette: BRAND_PALETTE,
    coralCoast: BRAND_PALETTE.coralCoast,
    eliteTeal: BRAND_PALETTE.eliteTeal,
    petroBlue: BRAND_PALETTE.petroBlue,
    pompeiiAsh: BRAND_PALETTE.pompeiiAsh,
    blissfulBlue: BRAND_PALETTE.blissfulBlue,
    darkSideMoon: BRAND_PALETTE.darkSideMoon,

    canvas: presetData.canvas,
    primary: presetData.primary,
    navPill: presetData.navPill,
    status: STATUS_COLORS,
    text: presetData.text,
    chart: presetData.chart,

    // Clinical emergency, warning, success, info helpers
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
    cardSurface: presetData.canvas.surface,
    cardBorder: presetData.canvas.border,
  };

  return {
    colors,
    typography,
    spatial,
    spacing: spatial.spacing,
    radii: spatial.radii,
    shadows: spatial.shadows,
    shadows3d: spatial.shadows3d,
    glassmorphism: spatial.glassmorphism,
    isDark,
    preset,
  };
};

const initialTheme = buildTheme(activeDesignConfig.activePreset);

export const ThemeContext = createContext<ThemeContextValue>({
  theme: initialTheme,
  preset: activeDesignConfig.activePreset,
  setPreset: () => {},
  isDark: false,
  toggleDark: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  initialPreset?: ThemePreset;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialPreset = activeDesignConfig.activePreset,
}) => {
  const [preset, setPreset] = useState<ThemePreset>(initialPreset);
  const [isDark, setIsDark] = useState<boolean>(initialPreset === 'midnightDark');

  const handleSetPreset = (newPreset: ThemePreset) => {
    setPreset(newPreset);
    if (newPreset === 'midnightDark') {
      setIsDark(true);
    } else if (isDark) {
      setIsDark(false);
    }
  };

  const handleToggleDark = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        setPreset('midnightDark');
      } else {
        setPreset('coralTeal');
      }
      return next;
    });
  };

  const currentTheme = useMemo(() => buildTheme(preset, isDark), [preset, isDark]);

  const value = useMemo(
    () => ({
      theme: currentTheme,
      preset,
      setPreset: handleSetPreset,
      isDark,
      toggleDark: handleToggleDark,
    }),
    [currentTheme, preset, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
