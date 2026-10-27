import { Icon } from '../Icon';
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';

interface CircularDrilldownButtonProps {
  onPress: () => void;
  size?: number;
  iconColor?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const CircularDrilldownButton: React.FC<CircularDrilldownButtonProps> = ({
  onPress,
  size = 36,
  iconColor = theme.colors.text.primary,
  backgroundColor = theme.colors.canvas.surface,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Icon
        name="arrowUpRight"
        size={Math.round(size * 0.52)}
        color={iconColor}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    ...theme.spatial.shadows.drilldownButton,
  },
});
