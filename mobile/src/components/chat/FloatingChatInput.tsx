import { Icon } from '../Icon';
import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

export interface AttachedMedia {
  uri: string;
  type: 'image' | 'video';
  name?: string;
}

interface FloatingChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onMicPress?: () => void;
  onAttachPress?: () => void;
  attachedMedia?: AttachedMedia | null;
  onRemoveMedia?: () => void;
  placeholder?: string;
  loading?: boolean;
}

export const FloatingChatInput: React.FC<FloatingChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  onMicPress,
  onAttachPress,
  attachedMedia,
  onRemoveMedia,
  placeholder = 'Ask anything about your health?',
  loading = false,
}) => {
  const hasText = value.trim().length > 0;
  const canSend = (hasText || Boolean(attachedMedia)) && !loading;

  return (
    <View style={styles.container}>
      {/* Attached Media Preview Chip */}
      {attachedMedia && (
        <View style={styles.mediaPreviewContainer}>
          <View style={styles.mediaPreviewCard}>
            {attachedMedia.type === 'image' ? (
              <Image source={{ uri: attachedMedia.uri }} style={styles.previewThumbnail} />
            ) : (
              <View style={styles.videoThumbnailPlaceholder}>
                <Icon name="videoCamera" size={20} color={theme.colors.ramp.white} />
              </View>
            )}

            <View style={styles.mediaInfo}>
              <Text style={styles.mediaTypeLabel}>
                {attachedMedia.type === 'image' ? 'Photo attached' : 'Video attached'}
              </Text>
              <Text style={styles.mediaHint}>Ready to submit for triage</Text>
            </View>

            {onRemoveMedia && (
              <TouchableOpacity
                onPress={onRemoveMedia}
                style={styles.removeMediaBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="closeCircle" size={20} color={theme.colors.ramp.gray500} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.pillInputContainer}>
        {/* Attachment Button */}
        {onAttachPress && (
          <TouchableOpacity activeOpacity={0.7} onPress={onAttachPress} style={styles.attachButton}>
            <Icon name="paperclip" size={21} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.input}
          placeholder={attachedMedia ? 'Add a note or symptom description...' : placeholder}
          placeholderTextColor={theme.colors.text.muted}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
          returnKeyType="send"
        />

        {onMicPress && !hasText && (
          <TouchableOpacity activeOpacity={0.7} onPress={onMicPress} style={styles.micButton}>
            <Icon name="microphone" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (canSend) onSend();
          }}
          disabled={!canSend}
          style={styles.orbButton}
        >
          <LinearGradient
            colors={
              canSend
                ? [theme.colors.ramp.ink, theme.colors.ramp.inkElev]
                : [theme.colors.ramp.gray200, theme.colors.ramp.gray300]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientOrb}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.ramp.white} />
            ) : (
              <Icon name="arrowUp" size={18} color={theme.colors.ramp.white} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spatial.spacing.md,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  pillInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: theme.spatial.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    ...theme.spatial.shadows.card,
  },
  attachButton: {
    padding: 8,
    marginRight: 2,
    borderRadius: 18,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.primary,
    paddingVertical: 6,
  },
  micButton: {
    padding: 8,
    marginRight: 4,
  },
  orbButton: {
    marginLeft: 4,
  },
  gradientOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPreviewContainer: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  mediaPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.ramp.gray200,
    padding: 6,
    paddingRight: 10,
    ...theme.spatial.shadows.sm,
  },
  previewThumbnail: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: theme.colors.ramp.gray100,
  },
  videoThumbnailPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: theme.colors.ramp.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  mediaTypeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  mediaHint: {
    fontSize: 11,
    color: theme.colors.ramp.gray500,
    marginTop: 1,
  },
  removeMediaBtn: {
    padding: 4,
  },
});
