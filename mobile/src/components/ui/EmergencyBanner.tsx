import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface EmergencyBannerProps {
  onStartEmergencyTriage?: () => void;
  emergencyNumber?: string;
  title?: string;
  subtitle?: string;
  onCallEmergency?: () => void;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({
  onStartEmergencyTriage,
  emergencyNumber = '911',
  title = 'EMERGENCY TRIAGE',
  subtitle = 'Life-threatening symptom? Call services immediately.',
  onCallEmergency,
}) => {
  const handleCallEmergency = () => {
    if (onCallEmergency) {
      onCallEmergency();
      return;
    }
    const telUrl = Platform.select({
      ios: `telprompt:${emergencyNumber}`,
      default: `tel:${emergencyNumber}`,
    });
    Linking.openURL(telUrl).catch((err) =>
      console.warn('Failed to launch emergency dialer:', err)
    );
  };

  return (
    <View style={styles.banner}>
      <View style={styles.textColumn}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name="alert-octagon"
            size={20}
            color={theme.colors.status.emergency.primary}
          />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCallEmergency}
          style={styles.callButton}
        >
          <MaterialCommunityIcons name="phone" size={16} color="#FFFFFF" />
          <Text style={styles.callButtonText}>Call {emergencyNumber}</Text>
        </TouchableOpacity>

        {onStartEmergencyTriage && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onStartEmergencyTriage}
            style={styles.guideButton}
          >
            <Text style={styles.guideButtonText}>First Aid</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.status.emergency.surface,
    borderColor: theme.colors.status.emergency.border,
    borderWidth: 1,
    borderRadius: theme.spatial.radii.lg,
    padding: theme.spatial.spacing.md,
    marginHorizontal: theme.spatial.spacing.md,
    marginBottom: theme.spatial.spacing.md,
  },
  textColumn: {
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.status.emergency.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.status.emergency.text,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.status.emergency.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.spatial.radii.pill,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  guideButton: {
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.status.emergency.border,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.spatial.radii.pill,
  },
  guideButtonText: {
    color: theme.colors.status.emergency.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
