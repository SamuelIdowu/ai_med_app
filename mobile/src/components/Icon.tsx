import React from 'react';
import { View } from 'react-native';

import { theme } from '../theme';
import type { IconTone } from '../icons/types';
import {
  getLasoGlyph,
  getPhosphorIcon,
  isIconName,
} from '../icons/registry';
import { iconSizes } from '../theme/icons';
import type { IconComponentProps } from '../icons/types';

const getToneColor = (tone: IconTone | undefined, color?: string): string => {
  if (color) return color;

  switch (tone) {
    case 'muted':
      return theme.colors.text.secondary;
    case 'primary':
    case 'brand':
      return theme.colors.primary.main;
    case 'success':
      return theme.colors.status.success.primary;
    case 'warning':
      return theme.colors.status.warning.primary;
    case 'danger':
      return theme.colors.status.emergency.primary;
    case 'inverse':
      return theme.colors.text.inverse;
    default:
      return theme.colors.text.primary;
  }
};

const resolveSize = (size: IconComponentProps['size']): number => {
  if (typeof size === 'number') return size;
  if (size && size in iconSizes) return iconSizes[size as keyof typeof iconSizes];
  return iconSizes.md;
};

export const Icon: React.FC<IconComponentProps> = ({
  name,
  size = iconSizes.md,
  color,
  tone = 'default',
  weight = 'regular',
  style,
  testID,
  accessibilityLabel,
}) => {
  const resolvedSize = resolveSize(size);
  const resolvedColor = getToneColor(tone, color);

  if (!isIconName(name)) return null;

  const Glyph = getLasoGlyph(name);
  if (Glyph) {
    return (
      <View
        style={style}
        testID={testID}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        <Glyph
          size={resolvedSize}
          color={resolvedColor}
          strokeWidth={
            weight === 'bold'
              ? theme.icon.strokeWidthBold
              : theme.icon.strokeWidth
          }
        />
      </View>
    );
  }

  const PhosphorIcon = getPhosphorIcon(name);
  if (!PhosphorIcon) return null;

  return (
    <PhosphorIcon
      color={resolvedColor}
      size={resolvedSize}
      weight={weight}
      style={style}
      testID={testID}
      title={accessibilityLabel}
    />
  );
};

export default Icon;
