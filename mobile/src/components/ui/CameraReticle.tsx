import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';

interface CameraReticleProps {
  instruction?: string;
  size?: number;
}

export const CameraReticle: React.FC<CameraReticleProps> = ({
  instruction = 'Center wound or symptom inside frame',
  size = 260,
}) => {
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.reticleFrame, { width: size, height: size }]}>
        {/* Four Corner Accents */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>
      {instruction ? (
        <View style={styles.badge}>
          <Text style={styles.instructionText}>{instruction}</Text>
        </View>
      ) : null}
    </View>
  );
};

const CORNER_SIZE = 24;
const BORDER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleFrame: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: BORDER_WIDTH,
    borderLeftWidth: BORDER_WIDTH,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: BORDER_WIDTH,
    borderRightWidth: BORDER_WIDTH,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: BORDER_WIDTH,
    borderLeftWidth: BORDER_WIDTH,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: BORDER_WIDTH,
    borderRightWidth: BORDER_WIDTH,
    borderBottomRightRadius: 8,
  },
  badge: {
    marginTop: 12,
    backgroundColor: 'rgba(17, 19, 24, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.spatial.radii.pill,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
