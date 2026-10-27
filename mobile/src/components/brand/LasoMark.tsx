import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Icon } from '../Icon';
import { theme } from '../../theme';

export type LasoMarkVariant = 'emblem' | 'compact' | 'wordmark';
export type LasoMarkTone = 'brand' | 'inverse' | 'mono';

export interface LasoMarkProps {
  variant?: LasoMarkVariant;
  tone?: LasoMarkTone;
  size?: number;
  style?: any;
  testID?: string;
}

const getColors = (tone: LasoMarkTone) => {
  if (tone === 'inverse') {
    return { mark: '#FFFFFF', text: '#FFFFFF' };
  }
  if (tone === 'mono') {
    return { mark: theme.colors.text?.primary || '#111827', text: theme.colors.text?.primary || '#111827' };
  }
  // brand — use text/brand, avoid green accent
  return { mark: theme.colors.text?.primary || '#111827', text: theme.colors.text?.primary || '#111827' };
};

export const LasoMark: React.FC<LasoMarkProps> = ({
  variant = 'emblem',
  tone = 'brand',
  size = 32,
  style,
  testID,
}) => {
  const c = getColors(tone);

  if (variant === 'emblem') {
    return (
      <View style={[styles.center, style]} testID={testID} accessibilityLabel="Laso">
        <Icon name="triagePulse" size={size} color={c.mark} />
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={[styles.row, style]} testID={testID} accessibilityLabel="Laso">
        <Icon name="triagePulse" size={size} color={c.mark} />
        <Text style={[styles.text, { color: c.text, fontSize: size * 0.56 }]}>Laso</Text>
      </View>
    );
  }

  // wordmark
  return (
    <View style={[styles.center, style]} testID={testID} accessibilityLabel="Laso">
      <Text style={[styles.wordmark, { color: c.text, fontSize: size * 0.64 }]}>Laso</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: -0.8,
  },
});

export default LasoMark;

