import React, { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

export type MedicalCardVariant = '3d' | 'glass' | 'standard' | 'flat' | 'emergency';

interface MedicalCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: MedicalCardVariant;
  onPress?: () => void;
  activeOpacity?: number;
}

export const MedicalCard: React.FC<MedicalCardProps> = ({
  children,
  style,
  variant = '3d',
  onPress,
  activeOpacity = 0.85,
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'glass':
        return {
          ...theme.spatial.glassmorphism.light,
          borderRadius: theme.spatial.radii.lg,
          ...theme.spatial.shadows3d.card3d,
        };
      case 'emergency':
        return {
          backgroundColor: theme.colors.status.emergency.surface,
          borderColor: theme.colors.status.emergency.border,
          borderWidth: 1.5,
          borderRadius: theme.spatial.radii.lg,
          ...theme.spatial.shadows3d.emergencyGlow,
        };
      case 'flat':
        return {
          backgroundColor: theme.colors.canvas.surface,
          borderColor: theme.colors.canvas.border,
          borderWidth: 1,
          borderRadius: theme.spatial.radii.lg,
        };
      case 'standard':
        return {
          backgroundColor: theme.colors.canvas.surface,
          borderColor: theme.colors.canvas.border,
          borderWidth: 1,
          borderRadius: theme.spatial.radii.lg,
          ...theme.spatial.shadows.card,
        };
      case '3d':
      default:
        return {
          backgroundColor: theme.colors.canvas.surface,
          borderColor: theme.colors.canvas.border,
          borderWidth: 1,
          borderRadius: theme.spatial.radii.lg,
          ...theme.spatial.shadows3d.card3d,
        };
    }
  };

  const cardStyle = [styles.base, getVariantStyle(), style];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    padding: theme.spatial.spacing.md,
  },
});

