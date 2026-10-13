import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';

interface RhythmWaveformProps {
  barCount?: number;
  height?: number;
  activeColor?: string;
  mutedColor?: string;
  style?: ViewStyle;
}

export const RhythmWaveform: React.FC<RhythmWaveformProps> = ({
  barCount = 24,
  height = 32,
  activeColor = '#0F1115',
  mutedColor = '#E5E7EB',
  style,
}) => {
  // Pattern representing cardiac pulse oscillation
  const pattern = [
    0.3, 0.4, 0.25, 0.5, 0.8, 0.35, 0.95, 0.6, 0.3, 0.2, 0.4, 0.85,
    0.7, 0.3, 0.5, 0.9, 0.4, 0.3, 0.65, 0.8, 0.45, 0.3, 0.2, 0.35,
  ];

  return (
    <View style={[styles.container, { height }, style]}>
      {Array.from({ length: barCount }).map((_, i) => {
        const factor = pattern[i % pattern.length];
        const barHeight = Math.max(4, height * factor);
        const isSpike = factor > 0.7;

        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: isSpike ? activeColor : mutedColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
