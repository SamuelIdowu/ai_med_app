import React, { useMemo } from 'react';
import {
  DimensionValue,
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  getIllustration,
  ILLUSTRATIONS,
  IllustrationKey,
} from '../assets/illustrations';

export type IllustrationFit = 'contain' | 'cover';

export interface IllustrationProps {
  /** Registry key of the illustration to render. */
  name: IllustrationKey;
  /** Width of the illustration box (logical pixels or a percentage string). */
  width: DimensionValue;
  /** Height of the illustration box (logical pixels or a percentage string). */
  height?: DimensionValue;
  /** How the artwork fills the box. `contain` keeps the full subject visible. */
  fit?: IllustrationFit;
  /** Extra style applied to the illustration box. */
  style?: StyleProp<ViewStyle>;
  /** Extra style applied to the underlying image. */
  imageStyle?: StyleProp<ImageStyle>;
  /** Accessibility label. Defaults to the registry title. */
  accessibilityLabel?: string;
  /** Rendered when the asset cannot be resolved. */
  fallback?: React.ReactNode;
}

/**
 * Shared renderer for the transparent medical illustrations.
 *
 * Every illustration is a transparent PNG, so it can sit directly on any
 * surface without a background plate. The component keeps the artwork's
 * aspect ratio inside the requested box by default, which prevents the
 * common bug of a non-square illustration being stretched.
 */
export const Illustration: React.FC<IllustrationProps> = ({
  name,
  width,
  height,
  fit = 'contain',
  style,
  imageStyle,
  accessibilityLabel,
  fallback = null,
}) => {
  const source = getIllustration(name);

  // Default to the registry title so every illustration is announced
  // meaningfully by screen readers without extra boilerplate at call sites.
  const resolvedLabel = accessibilityLabel ?? ILLUSTRATIONS[name]?.title;

  const resolvedHeight = useMemo(() => {
    if (height != null) return height;
    // Square-ish default keeps small usages visually stable.
    return width;
  }, [height, width]);

  if (!source) {
    return <View style={[{ width, height: resolvedHeight }, style]}>{fallback}</View>;
  }

  return (
    <View style={[{ width, height: resolvedHeight }, style]}>
      <Image
        source={source}
        style={[styles.image, { width, height: resolvedHeight }, imageStyle]}
        resizeMode={fit}
        accessible
        accessibilityLabel={resolvedLabel}
        accessibilityRole="image"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    // The transparent artwork must not be clipped by a rounded wrapper that
    // was designed for the old opaque renders.
    backgroundColor: 'transparent',
  },
});

export default Illustration;
