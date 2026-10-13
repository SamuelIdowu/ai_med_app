// Global typography interceptor for React Native
// Ensures Plus Jakarta Sans is applied uniformly across all screens, cards, and UI components
import { StyleSheet, Platform } from 'react-native';
import { fontFamilies } from './typography';

const resolveFontFamily = (style: any): any => {
  if (!style || typeof style !== 'object') {
    return style;
  }

  // Preserve icon fonts (e.g. Ionicons, MaterialCommunityIcons, FontAwesome)
  if (
    style.fontFamily &&
    style.fontFamily !== 'System' &&
    style.fontFamily !== 'Roboto' &&
    style.fontFamily !== 'sans-serif'
  ) {
    return style;
  }

  // Only apply font families to styles that define typographic properties
  const hasTextProp =
    style.fontSize !== undefined ||
    style.fontWeight !== undefined ||
    style.lineHeight !== undefined ||
    style.letterSpacing !== undefined ||
    style.textAlign !== undefined ||
    style.textTransform !== undefined ||
    style.fontStyle !== undefined;

  if (!hasTextProp) {
    return style;
  }

  const rawWeight = style.fontWeight ? String(style.fontWeight).toLowerCase() : '400';
  let family: string | undefined = fontFamilies.regular;

  if (rawWeight === '800' || rawWeight === '900' || rawWeight === 'heavy' || rawWeight === 'black') {
    family = fontFamilies.extraBold;
  } else if (rawWeight === '700' || rawWeight === 'bold') {
    family = fontFamilies.bold;
  } else if (rawWeight === '600' || rawWeight === 'semibold') {
    family = fontFamilies.semiBold;
  } else if (rawWeight === '500' || rawWeight === 'medium') {
    family = fontFamilies.medium;
  } else {
    family = fontFamilies.regular;
  }

  if (!family) {
    return style;
  }

  return {
    ...style,
    fontFamily: family,
    // On Android, clear fontWeight to prevent native Typeface synthesizing issues with custom fonts
    ...(Platform.OS === 'android' ? { fontWeight: 'normal' } : {}),
  };
};

const originalCreate = StyleSheet.create;

StyleSheet.create = function <T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  styles: T | StyleSheet.NamedStyles<T>
): T {
  if (!styles || typeof styles !== 'object') {
    return originalCreate(styles) as any;
  }

  const patched: any = {};
  for (const key in styles) {
    if (Object.prototype.hasOwnProperty.call(styles, key)) {
      patched[key] = resolveFontFamily(styles[key]);
    }
  }

  return originalCreate(patched);
} as any;
