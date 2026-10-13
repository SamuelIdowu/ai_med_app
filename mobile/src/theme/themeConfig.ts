// ============================================================================
// CENTRALIZED DESIGN SYSTEM CONFIGURATION
// ============================================================================
// Change theme presets, fonts, or colors right here in one place.
// Every screen, card, button, chart, and text component updates automatically!

export type ThemePreset = 'monochrome' | 'clinicalWarm' | 'cleanSlate' | 'modernTeal' | 'midnightDark';
export type FontPreset =
  | 'MontserratAlt_SpaceGrotesk' // Modern Pair: Space Grotesk Headings/Metrics + Montserrat Alt Body
  | 'SpaceGrotesk'             // Complete Space Grotesk
  | 'MontserratAlternates'     // Complete Montserrat Alternates
  | 'PlusJakartaSans'          // Geometric Sans
  | 'Inter'                    // Neutral UI Sans
  | 'System';                  // Native OS Sans

export interface ThemeConfig {
  /**
   * Active visual theme preset:
   * - 'monochrome'    : Sleek Black & White (Onyx #0F1115, White #FFFFFF, Light Gray #F3F4F6)
   * - 'clinicalWarm' : Warm off-white #F8F7F4 + Electric Cobalt (Matches reference.webp)
   * - 'cleanSlate'    : Pure clinical white #F8FAFC + Deep Sapphire #0284C7
   * - 'modernTeal'    : Soft mint canvas #F0FDFA + Medical Emerald Teal #0D9488
   * - 'midnightDark'  : Deep charcoal #0B0F19 + Luminous Sky #38BDF8
   */
  activePreset: ThemePreset;

  /**
   * Active font family preset:
   * - 'MontserratAlt_SpaceGrotesk' : Paired (Space Grotesk Headlines/Metrics + Montserrat Alternates Body)
   * - 'SpaceGrotesk'             : Full Space Grotesk across all weights
   * - 'MontserratAlternates'     : Full Montserrat Alternates across all weights
   * - 'PlusJakartaSans'          : Modern geometric medical sans-serif
   * - 'Inter'                    : Highly legible neutral interface typeface
   * - 'System'                   : Native OS default (San Francisco / Roboto)
   */
  activeFont: FontPreset;

  /**
   * Optional manual overrides for immediate tweaking without creating a new preset
   */
  customOverrides?: {
    primaryMain?: string;
    canvasBackground?: string;
    cardSurface?: string;
    cardBorder?: string;
    borderRadiusLg?: number;
  };
}

// ============================================================================
// 👉 ACTIVE CONFIGURATION SWITCH - EDIT HERE TO SWAP THEME OR FONT
// ============================================================================
export const activeDesignConfig: ThemeConfig = {
  activePreset: 'monochrome', // 👈 Black and White theme throughout the app
  activeFont: 'MontserratAlt_SpaceGrotesk',
};

// ============================================================================
// THEME PRESET PALETTES
// ============================================================================
export const THEME_PRESETS = {
  // 0. Monochrome / Black and White (Consistent Onyx & White)
  monochrome: {
    canvas: {
      background: '#F8F9FA',
      surface: '#FFFFFF',
      surfaceSubtle: '#F3F4F6',
      border: '#E5E7EB',
      borderFocus: '#0F1115',
    },
    primary: {
      main: '#0F1115',
      hover: '#262A33',
      light: '#F3F4F6',
      border: '#E5E7EB',
    },
    navPill: {
      background: '#0F1115',
      border: 'rgba(255, 255, 255, 0.12)',
      activeIndicator: '#262A33',
      activeIcon: '#FFFFFF',
      inactiveIcon: '#9CA3AF',
      shadow: 'rgba(0, 0, 0, 0.28)',
    },
    text: {
      primary: '#0F1115',
      secondary: '#4B5563',
      muted: '#9CA3AF',
      inverse: '#FFFFFF',
    },
    chart: {
      linePrimary: '#0F1115',
      lineGradientStart: 'rgba(15, 17, 21, 0.18)',
      lineGradientEnd: 'rgba(15, 17, 21, 0.00)',
      donutRingOuter: '#0F1115',
      donutRingMiddle: '#4B5563',
      donutRingInner: '#E5E7EB',
      barNormal: '#0F1115',
      barElevated: '#4B5563',
      barMuted: '#E5E7EB',
      gridLine: '#F3F4F6',
    },
  },

  // 1. Clinical Warm (Based on reference.webp)
  clinicalWarm: {
    canvas: {
      background: '#F8F7F4',
      surface: '#FFFFFF',
      surfaceSubtle: '#F2EFE9',
      border: '#EAE6DF',
      borderFocus: '#1A60FF',
    },
    primary: {
      main: '#1A60FF',
      hover: '#0D50E6',
      light: '#EBF2FF',
      border: '#BFD7FE',
    },
    navPill: {
      background: '#111318',
      border: 'rgba(255, 255, 255, 0.08)',
      activeIndicator: '#1A60FF',
      activeIcon: '#FFFFFF',
      inactiveIcon: '#717886',
      shadow: 'rgba(0, 0, 0, 0.28)',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      muted: '#94A3B8',
      inverse: '#FFFFFF',
    },
    chart: {
      linePrimary: '#1A60FF',
      lineGradientStart: 'rgba(26, 96, 255, 0.20)',
      lineGradientEnd: 'rgba(26, 96, 255, 0.00)',
      donutRingOuter: '#1A60FF',
      donutRingMiddle: '#60A5FA',
      donutRingInner: '#CBD5E1',
      barNormal: '#1A60FF',
      barElevated: '#EF4444',
      barMuted: '#E2E8F0',
      gridLine: '#F1F5F9',
    },
  },

  // 2. Clean Slate (Pure White Minimalist)
  cleanSlate: {
    canvas: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceSubtle: '#F1F5F9',
      border: '#E2E8F0',
      borderFocus: '#0284C7',
    },
    primary: {
      main: '#0284C7',
      hover: '#0369A1',
      light: '#E0F2FE',
      border: '#BAE6FD',
    },
    navPill: {
      background: '#0F172A',
      border: 'rgba(255, 255, 255, 0.08)',
      activeIndicator: '#0284C7',
      activeIcon: '#FFFFFF',
      inactiveIcon: '#64748B',
      shadow: 'rgba(0, 0, 0, 0.25)',
    },
    text: {
      primary: '#0F172A',
      secondary: '#334155',
      muted: '#64748B',
      inverse: '#FFFFFF',
    },
    chart: {
      linePrimary: '#0284C7',
      lineGradientStart: 'rgba(2, 132, 199, 0.20)',
      lineGradientEnd: 'rgba(2, 132, 199, 0.00)',
      donutRingOuter: '#0284C7',
      donutRingMiddle: '#38BDF8',
      donutRingInner: '#CBD5E1',
      barNormal: '#0284C7',
      barElevated: '#EF4444',
      barMuted: '#E2E8F0',
      gridLine: '#F1F5F9',
    },
  },

  // 3. Modern Teal (Clinical Bio-Medical)
  modernTeal: {
    canvas: {
      background: '#F0FDFA',
      surface: '#FFFFFF',
      surfaceSubtle: '#E6FFFA',
      border: '#CCFBF1',
      borderFocus: '#0D9488',
    },
    primary: {
      main: '#0D9488',
      hover: '#0F766E',
      light: '#CCFBF1',
      border: '#99F6E4',
    },
    navPill: {
      background: '#134E4A',
      border: 'rgba(255, 255, 255, 0.10)',
      activeIndicator: '#0D9488',
      activeIcon: '#FFFFFF',
      inactiveIcon: '#5EEAD4',
      shadow: 'rgba(0, 0, 0, 0.25)',
    },
    text: {
      primary: '#134E4A',
      secondary: '#115E59',
      muted: '#2DD4BF',
      inverse: '#FFFFFF',
    },
    chart: {
      linePrimary: '#0D9488',
      lineGradientStart: 'rgba(13, 148, 136, 0.20)',
      lineGradientEnd: 'rgba(13, 148, 136, 0.00)',
      donutRingOuter: '#0D9488',
      donutRingMiddle: '#2DD4BF',
      donutRingInner: '#CCFBF1',
      barNormal: '#0D9488',
      barElevated: '#EF4444',
      barMuted: '#E2E8F0',
      gridLine: '#F0FDFA',
    },
  },

  // 4. Midnight Dark (Sleek Dark Mode)
  midnightDark: {
    canvas: {
      background: '#0B0F19',
      surface: '#161F30',
      surfaceSubtle: '#1F2B42',
      border: '#2D3D5D',
      borderFocus: '#38BDF8',
    },
    primary: {
      main: '#38BDF8',
      hover: '#0EA5E9',
      light: 'rgba(56, 189, 248, 0.15)',
      border: '#0284C7',
    },
    navPill: {
      background: '#1E293B',
      border: 'rgba(255, 255, 255, 0.12)',
      activeIndicator: '#38BDF8',
      activeIcon: '#0F172A',
      inactiveIcon: '#94A3B8',
      shadow: 'rgba(0, 0, 0, 0.50)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      muted: '#64748B',
      inverse: '#0F172A',
    },
    chart: {
      linePrimary: '#38BDF8',
      lineGradientStart: 'rgba(56, 189, 248, 0.25)',
      lineGradientEnd: 'rgba(56, 189, 248, 0.00)',
      donutRingOuter: '#38BDF8',
      donutRingMiddle: '#0284C7',
      donutRingInner: '#334155',
      barNormal: '#38BDF8',
      barElevated: '#EF4444',
      barMuted: '#1E293B',
      gridLine: '#1E293B',
    },
  },
} as const;

// ============================================================================
// FONT PRESETS
// ============================================================================
export const FONT_PRESETS = {
  // 🌟 Paired: Space Grotesk (for Headings, Displays, Numbers) + Montserrat Alternates (Body, UI)
  MontserratAlt_SpaceGrotesk: {
    regular: 'MontserratAlternates_400Regular',
    medium: 'MontserratAlternates_500Medium',
    semiBold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
    extraBold: 'SpaceGrotesk_700Bold',
    headingBold: 'SpaceGrotesk_700Bold',
    metricDisplay: 'SpaceGrotesk_700Bold',
  },

  // Space Grotesk across all weights
  SpaceGrotesk: {
    regular: 'SpaceGrotesk_400Regular',
    medium: 'SpaceGrotesk_500Medium',
    semiBold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
    extraBold: 'SpaceGrotesk_700Bold',
    headingBold: 'SpaceGrotesk_700Bold',
    metricDisplay: 'SpaceGrotesk_700Bold',
  },

  // Montserrat Alternates across all weights
  MontserratAlternates: {
    regular: 'MontserratAlternates_400Regular',
    medium: 'MontserratAlternates_500Medium',
    semiBold: 'MontserratAlternates_600SemiBold',
    bold: 'MontserratAlternates_700Bold',
    extraBold: 'MontserratAlternates_800ExtraBold',
    headingBold: 'MontserratAlternates_700Bold',
    metricDisplay: 'MontserratAlternates_800ExtraBold',
  },

  PlusJakartaSans: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extraBold: 'PlusJakartaSans_800ExtraBold',
    headingBold: 'PlusJakartaSans_700Bold',
    metricDisplay: 'PlusJakartaSans_800ExtraBold',
  },

  Inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
    headingBold: 'Inter_700Bold',
    metricDisplay: 'Inter_800ExtraBold',
  },

  System: {
    regular: undefined,
    medium: undefined,
    semiBold: undefined,
    bold: undefined,
    extraBold: undefined,
    headingBold: undefined,
    metricDisplay: undefined,
  },
} as const;

// Status colors adapted for monochrome Black & White theme (colors will be re-added later)
export const STATUS_COLORS = {
  emergency: {
    primary: '#0F1115',
    surface: '#F3F4F6',
    border: '#E5E7EB',
    text: '#0F1115',
  },
  warning: {
    primary: '#374151',
    surface: '#F3F4F6',
    border: '#E5E7EB',
    text: '#0F1115',
  },
  success: {
    primary: '#0F1115',
    surface: '#F3F4F6',
    border: '#E5E7EB',
    text: '#0F1115',
  },
  info: {
    primary: '#0F1115',
    surface: '#F3F4F6',
    border: '#E5E7EB',
    text: '#0F1115',
  },
} as const;
