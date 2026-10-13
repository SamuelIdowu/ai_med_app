// Centralized Medical Design System - Typography
// Dynamically configured by the activeFont preset in themeConfig.ts

import { TextStyle } from 'react-native';
import { activeDesignConfig, FONT_PRESETS } from './themeConfig';

const selectedFontPreset = FONT_PRESETS[activeDesignConfig.activeFont] || FONT_PRESETS.MontserratAlt_SpaceGrotesk;

export const fontFamilies = {
  regular: selectedFontPreset.regular,
  medium: selectedFontPreset.medium,
  semiBold: selectedFontPreset.semiBold,
  bold: selectedFontPreset.bold,
  extraBold: selectedFontPreset.extraBold,
  headingBold: selectedFontPreset.headingBold || selectedFontPreset.bold,
  metricDisplay: selectedFontPreset.metricDisplay || selectedFontPreset.extraBold,
};

export const typography = {
  metricDisplay: {
    fontFamily: fontFamilies.metricDisplay,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
    letterSpacing: -1.0,
  } as TextStyle,
  display: {
    fontFamily: fontFamilies.headingBold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.6,
  } as TextStyle,
  h1: {
    fontFamily: fontFamilies.headingBold,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.4,
  } as TextStyle,
  h2: {
    fontFamily: fontFamilies.headingBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
  } as TextStyle,
  h3: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,
  bodyBold: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,
  bodySmall: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,
  caption: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0.1,
  } as TextStyle,
  micro: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.4,
  } as TextStyle,
} as const;

export type AppTypography = typeof typography;
