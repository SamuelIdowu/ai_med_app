import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { theme } from '../../theme';

export interface RingData {
  label: string;
  value: number; // 0 to 100 percentage
  color: string;
}

interface ConcentricVitalsRingProps {
  rings?: RingData[];
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  centerText?: string;
  centerSubtext?: string;
  style?: ViewStyle;
}

const DEFAULT_RINGS: RingData[] = [
  { label: 'Awake', value: 9, color: '#9CA3AF' },
  { label: 'Light', value: 75, color: '#0F1115' },
  { label: 'Deep', value: 16, color: '#4B5563' },
];

export const ConcentricVitalsRing: React.FC<ConcentricVitalsRingProps> = ({
  rings = DEFAULT_RINGS,
  size = 140,
  strokeWidth = 10,
  showLegend = true,
  centerText,
  centerSubtext,
  style,
}) => {
  const center = size / 2;
  const gap = strokeWidth + 4;

  return (
    <View style={[styles.container, style]}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size}>
          {rings.map((ring, idx) => {
            const radius = center - strokeWidth / 2 - idx * gap;
            if (radius <= 0) return null;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset =
              circumference - (Math.min(100, Math.max(0, ring.value)) / 100) * circumference;

            return (
              <G key={ring.label} rotation="-90" origin={`${center}, ${center}`}>
                {/* Background Ring Track */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="#F1F5F9"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Progress Ring */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                />
              </G>
            );
          })}
        </Svg>

        {centerText && (
          <View style={[styles.centerContent, { width: size, height: size }]}>
            <Text style={styles.centerText}>{centerText}</Text>
            {centerSubtext && (
              <Text style={styles.centerSubtext}>{centerSubtext}</Text>
            )}
          </View>
        )}
      </View>

      {showLegend && (
        <View style={styles.legendContainer}>
          {rings.map((ring) => (
            <View key={ring.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: ring.color }]} />
              <View>
                <Text style={styles.legendLabel}>{ring.label}</Text>
                <Text style={styles.legendValue}>{ring.value}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  centerSubtext: {
    fontSize: 11,
    color: theme.colors.text.muted,
  },
  legendContainer: {
    marginLeft: 16,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  legendValue: {
    fontSize: 11,
    color: theme.colors.text.muted,
  },
});
