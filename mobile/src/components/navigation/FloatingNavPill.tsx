import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  Modal,
  Text,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

export type NavTabId = 'Home' | 'Analytics' | 'AIChat' | 'Articles';

interface FloatingNavPillProps {
  activeRoute: NavTabId;
  onNavigate: (route: NavTabId) => void;
  onEmergencyPress?: () => void;
}

interface TabConfig {
  id: NavTabId;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accessibilityLabel: string;
}

// 4 main destinations from arch.webp: Home, Analytics, AI chatbot, Articles
const TABS: TabConfig[] = [
  { id: 'Home', icon: 'home-variant', accessibilityLabel: 'Home' },
  { id: 'Analytics', icon: 'clock-time-four-outline', accessibilityLabel: 'Analytics' },
  { id: 'AIChat', icon: 'robot-outline', accessibilityLabel: 'AI Chatbot' },
  { id: 'Articles', icon: 'file-document-outline', accessibilityLabel: 'Articles' },
];

export const FloatingNavPill: React.FC<FloatingNavPillProps> = ({
  activeRoute,
  onNavigate,
  onEmergencyPress,
}) => {
  const insets = useSafeAreaInsets();
  const bottomMargin = Math.max(insets.bottom + 4, 18);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const handleCallEmergency = () => {
    const telUrl = Platform.select({
      ios: 'telprompt:911',
      default: 'tel:911',
    });
    Linking.openURL(telUrl).catch((err) =>
      console.warn('Failed to launch emergency dialer:', err)
    );
  };

  const handleEmergencyPress = () => {
    if (onEmergencyPress) {
      onEmergencyPress();
    } else {
      setConfirmModalVisible(true);
    }
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.outerContainer, { bottom: bottomMargin }]}
      >
        <View style={styles.navRow}>
          {/* Main Dark Capsule containing the 4 primary tabs (from ref 4 - 8) */}
          <View style={styles.pillContainer}>
            {TABS.map((tab) => {
              const isActive = activeRoute === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={tab.accessibilityLabel}
                  onPress={() => onNavigate(tab.id)}
                  style={[styles.tabButton, isActive && styles.activeTabButton]}
                >
                  <MaterialCommunityIcons
                    name={tab.icon}
                    size={26}
                    color={
                      isActive
                        ? theme.colors.navPill.activeIcon
                        : theme.colors.navPill.inactiveIcon
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dedicated Circular Red Emergency Button on the far right (from ref7.webp) */}
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Call Emergency Services 911"
            onPress={handleEmergencyPress}
            style={styles.emergencyOuterRing}
          >
            <View style={styles.emergencyInnerCircle}>
              <MaterialCommunityIcons name="phone" size={26} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Call Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons
                name="phone-alert"
                size={32}
                color="#0F1115"
              />
            </View>

            <Text style={styles.modalTitle}>Emergency Call 911</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to call emergency services immediately?
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                activeOpacity={0.7}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCallButton}
                activeOpacity={0.8}
                onPress={() => {
                  setConfirmModalVisible(false);
                  handleCallEmergency();
                }}
              >
                <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
                <Text style={styles.modalCallText}>Call 911</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.navPill.background,
    borderRadius: theme.spatial.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.navPill.border,
    ...theme.spatial.shadows3d.floating3d,
    gap: 14,
  },
  tabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: theme.colors.navPill.activeIndicator,
  },
  // Tactile 3D Medical Red Emergency Button with radiant glow
  emergencyOuterRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: theme.colors.status.emergency.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.spatial.shadows3d.emergencyGlow,
  },
  emergencyInnerCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.status.emergency.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 16, 17, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...theme.spatial.shadows3d.floating3d,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.status.emergency.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: theme.colors.canvas.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  modalCallButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: theme.colors.status.emergency.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.spatial.shadows3d.emergencyGlow,
  },
  modalCallText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
