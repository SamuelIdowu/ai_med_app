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
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    } as ViewStyle,
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    } as ViewStyle,
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.24,
      shadowRadius: 16,
      elevation: 8,
    } as ViewStyle,
  },
  touchMinTarget: 48,
} as const;

export type AppSpatial = typeof spatial;
