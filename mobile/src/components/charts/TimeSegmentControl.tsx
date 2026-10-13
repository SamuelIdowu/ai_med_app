import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';

export type TimeSegment = 'Hourly' | 'Daily' | 'Weekly' | 'Monthly';

interface TimeSegmentControlProps {
  segments?: TimeSegment[];
  activeSegment: TimeSegment;
  onChange: (segment: TimeSegment) => void;
  style?: ViewStyle;
}

const DEFAULT_SEGMENTS: TimeSegment[] = ['Hourly', 'Daily', 'Weekly', 'Monthly'];

export const TimeSegmentControl: React.FC<TimeSegmentControlProps> = ({
  segments = DEFAULT_SEGMENTS,
  activeSegment,
  onChange,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {segments.map((seg) => {
        const isActive = seg === activeSegment;
        return (
          <TouchableOpacity
            key={seg}
            activeOpacity={0.8}
            onPress={() => onChange(seg)}
            style={[styles.segmentButton, isActive && styles.activeButton]}
          >
            <Text style={[styles.segmentText, isActive && styles.activeText]}>
              {seg}
            </Text>
          </TouchableOpacity>
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
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    borderRadius: theme.spatial.radii.pill,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.spatial.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#111318',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
