import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

export type TactileButtonVariant = 'primary' | 'outline' | 'emergency' | 'ghost' | 'secondary';
export type TactileButtonSize = 'sm' | 'md' | 'lg';

interface TactileButtonProps {
  label: string;
  onPress: () => void;
  variant?: TactileButtonVariant;
  size?: TactileButtonSize;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; iconColor: string } => {
    switch (variant) {
      case 'emergency':
        return {
          container: {
            backgroundColor: theme.colors.status.emergency.primary,
            borderColor: theme.colors.status.emergency.primary,
            ...theme.spatial.shadows3d.emergencyGlow,
          },
          text: { color: theme.colors.text.inverse },
          iconColor: theme.colors.text.inverse,
        };
      case 'outline':
        return {
          container: {
            backgroundColor: theme.colors.canvas.surface,
            borderColor: theme.colors.canvas.border,
            ...theme.spatial.shadows.sm,
          },
          text: { color: theme.colors.text.primary },
          iconColor: theme.colors.text.primary,
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: theme.colors.primary.light,
            borderColor: theme.colors.primary.border,
          },
          text: { color: theme.colors.primary.main },
          iconColor: theme.colors.primary.main,
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
          },
          text: { color: theme.colors.text.secondary },
          iconColor: theme.colors.text.secondary,
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: theme.colors.primary.main,
            borderColor: theme.colors.primary.main,
            ...theme.spatial.shadows3d.tactileButton,
          },
          text: { color: theme.colors.text.inverse },
          iconColor: theme.colors.text.inverse,
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingVertical: 8,
            paddingHorizontal: 14,
            minHeight: 36,
          },
          text: { fontSize: 13, lineHeight: 18 },
          iconSize: 16,
        };
      case 'lg':
        return {
          container: {
            paddingVertical: 16,
            paddingHorizontal: 24,
            minHeight: 56,
          },
          text: { fontSize: 17, lineHeight: 22 },
          iconSize: 22,
        };
      case 'md':
      default:
        return {
          container: {
            paddingVertical: 12,
            paddingHorizontal: 18,
            minHeight: 48,
          },
          text: { fontSize: 15, lineHeight: 20 },
          iconSize: 18,
        };
    }
  };

  const variantStyle = getVariantStyles();
  const sizeStyle = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.baseContainer,
        variantStyle.container,
        sizeStyle.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyle.iconColor}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <MaterialCommunityIcons
              name={icon}
              size={sizeStyle.iconSize}
              color={variantStyle.iconColor}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.baseText,
              variantStyle.text,
              sizeStyle.text,
              textStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <MaterialCommunityIcons
              name={icon}
              size={sizeStyle.iconSize}
              color={variantStyle.iconColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    borderRadius: theme.spatial.radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
