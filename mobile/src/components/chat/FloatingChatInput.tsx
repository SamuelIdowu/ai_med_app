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
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
                <MaterialCommunityIcons name="video" size={20} color="#FFFFFF" />
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
                <MaterialCommunityIcons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.pillInputContainer}>
        {/* Attachment Button */}
        {onAttachPress && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onAttachPress}
            style={styles.attachButton}
          >
            <MaterialCommunityIcons
              name="paperclip"
              size={21}
              color={theme.colors.text.secondary}
            />
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
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onMicPress}
            style={styles.micButton}
          >
            <MaterialCommunityIcons
              name="microphone"
              size={20}
              color={theme.colors.text.secondary}
            />
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
                ? ['#0F1115', '#262A33']
                : ['#E5E7EB', '#D1D5DB']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientOrb}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons
                name="arrow-up"
                size={18}
                color="#FFFFFF"
              />
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 6,
    paddingRight: 10,
    ...theme.spatial.shadows.sm,
  },
  previewThumbnail: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  videoThumbnailPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#0F1115',
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
    color: '#0F1115',
  },
  mediaHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  removeMediaBtn: {
    padding: 4,
  },
});
