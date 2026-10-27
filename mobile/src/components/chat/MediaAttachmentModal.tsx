import { Icon } from '../Icon';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { theme } from '../../theme';
import type { IconName } from '../../icons';

export type MediaCaptureAction = 'take_photo' | 'record_video' | 'pick_photo' | 'pick_video';

interface MediaAttachmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: MediaCaptureAction) => void;
}

interface ActionOption {
  id: MediaCaptureAction;
  title: string;
  description: string;
  icon: IconName;
  badge?: string;
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    id: 'take_photo',
    title: 'Take Photo',
    description: 'Capture a still picture of the injury or wound',
    icon: 'camera',
  },
  {
    id: 'record_video',
    title: 'Record Video',
    description: 'Record a video clip for motion & bleeding assessment',
    icon: 'videoCamera',
    badge: 'NEW',
  },
  {
    id: 'pick_photo',
    title: 'Upload Photo',
    description: 'Choose an existing photo from your library',
    icon: 'image',
  },
  {
    id: 'pick_video',
    title: 'Upload Video',
    description: 'Choose a recorded video clip from your library',
    icon: 'filmStrip',
  },
];

export const MediaAttachmentModal: React.FC<MediaAttachmentModalProps> = ({
  visible,
  onClose,
  onSelectAction,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Drag Handle Bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerTextGroup}>
                  <Text style={styles.title}>Add Media for AI Triage</Text>
                  <Text style={styles.subtitle}>
                    Capture photos or videos to assist clinical evaluation
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={styles.closeCircle}
                >
                  <Icon
                    name="close"
                    size={20}
                    color={theme.colors.text.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Options Grid / List */}
              <View style={styles.optionsList}>
                {ACTION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.75}
                    style={styles.optionCard}
                    onPress={() => {
                      onClose();
                      setTimeout(() => onSelectAction(opt.id), 150);
                    }}
                  >
                    <View style={styles.iconCircle}>
                      <Icon
                        name={opt.icon}
                        size={24}
                        color="#0F1115"
                      />
                    </View>

                    <View style={styles.optionContent}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>{opt.title}</Text>
                        {opt.badge && (
                          <View style={styles.badgePill}>
                            <Text style={styles.badgeText}>{opt.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.optionDesc}>{opt.description}</Text>
                    </View>

                    <Icon
                      name="caretRight"
                      size={20}
                      color={theme.colors.text.muted}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.cancelBtn}
                onPress={onClose}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 17, 21, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...theme.spatial.shadows.floatingPill,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F1115',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1115',
  },
  badgePill: {
    backgroundColor: '#0F1115',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  optionDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1115',
  },
});
