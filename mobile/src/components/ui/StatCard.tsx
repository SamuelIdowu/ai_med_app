import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { MedicalCard } from './MedicalCard';

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  statusBadge?: string;
  statusType?: 'success' | 'warning' | 'emergency' | 'info';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  iconColor = theme.colors.primary.main,
  statusBadge,
  statusType = 'info',
  onPress,
  style,
  children,
}) => {
  const getStatusBadgeColors = () => {
    switch (statusType) {
      case 'success':
        return {
          bg: theme.colors.status.success.surface,
          text: theme.colors.status.success.text,
          border: theme.colors.status.success.border,
        };
      case 'warning':
        return {
          bg: theme.colors.status.warning.surface,
          text: theme.colors.status.warning.text,
          border: theme.colors.status.warning.border,
        };
      case 'emergency':
        return {
          bg: theme.colors.status.emergency.surface,
          text: theme.colors.status.emergency.text,
          border: theme.colors.status.emergency.border,
        };
      case 'info':
      default:
        return {
          bg: theme.colors.primary.light,
          text: theme.colors.primary.main,
          border: theme.colors.primary.border,
        };
    }
  };

  const badgeColors = getStatusBadgeColors();

  return (
    <MedicalCard style={[styles.card, style]} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.titleText}>{title}</Text>
        {icon && (
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
          </View>
        )}
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.valueText}>{value}</Text>
        {unit ? <Text style={styles.unitText}>{unit}</Text> : null}
      </View>

      {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}

      {statusBadge && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: badgeColors.bg,
              borderColor: badgeColors.border,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: badgeColors.text }]}>
            {statusBadge}
          </Text>
        </View>
      )}

      {children}
    </MedicalCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: theme.spatial.spacing.md,
    minHeight: 124,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.canvas.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 2,
  },
  valueText: {
    ...theme.typography.metricDisplay,
    color: theme.colors.text.primary,
    fontSize: 32,
    lineHeight: 38,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginLeft: 6,
  },
  subtitleText: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.spatial.radii.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
