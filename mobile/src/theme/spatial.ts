// Centralized Medical Design System - Spatial & Shadows
// Generous 22pt card radii, pill buttons & floating navigation pill, soft diffusion shadows

import { ViewStyle } from 'react-native';

export const spatial = {
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radii: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,      // Standard Medical Cards
    xl: 28,      // Large Modal / Action Cards
    pill: 9999,  // Filter Chips, Floating Nav Pill, Primary Buttons
  },
  // Backwards compatibility alias
  borderRadius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 9999,
    full: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    } as ViewStyle,
    floatingPill: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.24,
      shadowRadius: 16,
      elevation: 8,
    } as ViewStyle,
    drilldownButton: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    } as ViewStyle,
    emergency: {
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.20,
      shadowRadius: 10,
      elevation: 4,
    } as ViewStyle,
    // Size aliases for convenience and backwards compatibility
    sm: {
      shadowColor: '#061011',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    } as ViewStyle,
    md: {
      shadowColor: '#061011',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 4,
    } as ViewStyle,
    lg: {
      shadowColor: '#061011',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
      elevation: 10,
    } as ViewStyle,
  },
  // 🔮 Tactile 3D Depth & Elevation System
  shadows3d: {
    card3d: {
      shadowColor: '#061011',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    } as ViewStyle,
    floating3d: {
      shadowColor: '#061011',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.24,
      shadowRadius: 24,
      elevation: 12,
    } as ViewStyle,
    tactileButton: {
      shadowColor: '#0e88a0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 5,
    } as ViewStyle,
    emergencyGlow: {
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    } as ViewStyle,
    accentGlow: {
      shadowColor: '#0e88a0',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.30,
      shadowRadius: 14,
      elevation: 6,
    } as ViewStyle,
    // Elevation level aliases for convenience
    level1: {
      shadowColor: '#061011',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    } as ViewStyle,
    level2: {
      shadowColor: '#0e88a0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 5,
    } as ViewStyle,
    level3: {
      shadowColor: '#061011',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.24,
      shadowRadius: 24,
      elevation: 12,
    } as ViewStyle,
  },
  // 🪟 Subtle Glassmorphic Presets (Frosted backgrounds with specular edges)
  glassmorphism: {
    light: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderColor: 'rgba(255, 255, 255, 0.80)',
      borderWidth: 1,
    } as ViewStyle,
    dark: {
      backgroundColor: 'rgba(15, 51, 58, 0.72)',
      borderColor: 'rgba(177, 200, 216, 0.22)',
      borderWidth: 1,
    } as ViewStyle,
    subtle: {
      backgroundColor: 'rgba(240, 249, 250, 0.70)',
      borderColor: 'rgba(14, 136, 160, 0.16)',
      borderWidth: 1,
    } as ViewStyle,
    emergency: {
      backgroundColor: 'rgba(254, 242, 242, 0.80)',
      borderColor: 'rgba(239, 68, 68, 0.32)',
      borderWidth: 1,
    } as ViewStyle,
    card: {
      backgroundColor: 'rgba(240, 249, 250, 0.70)',
      borderColor: 'rgba(14, 136, 160, 0.16)',
      borderWidth: 1,
    } as ViewStyle,
  },
  touchMinTarget: 48,
} as const;

export type AppSpatial = typeof spatial;
