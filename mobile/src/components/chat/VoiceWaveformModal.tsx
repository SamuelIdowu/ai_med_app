import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { RhythmWaveform } from '../charts/RhythmWaveform';

interface VoiceWaveformModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: (transcript: string) => void;
  transcript?: string;
  isRecording?: boolean;
}

export const VoiceWaveformModal: React.FC<VoiceWaveformModalProps> = ({
  visible,
  onClose,
  onConfirm,
  transcript = "I'm listening... Describe your symptoms, pain level, or what occurred.",
  isRecording = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [visible, isRecording, pulseAnim]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top bar with close button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={styles.closeCircle}
          >
            <MaterialCommunityIcons name="close" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Center Glowing AI Orb */}
        <View style={styles.centerContainer}>
          <Animated.View
            style={[
              styles.orbWrapper,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <LinearGradient
              colors={['#0F1115', '#262A33', '#4B5563']}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
              style={styles.orb}
            />
          </Animated.View>

          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>

        {/* Bottom Soundwave & Action Bar */}
        <View style={styles.bottomBar}>
          <RhythmWaveform
            barCount={32}
            height={44}
            activeColor="#0F1115"
            mutedColor="#E5E7EB"
            style={styles.waveform}
          />

          <View style={styles.controlsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.controlCircle}
            >
              <MaterialCommunityIcons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (onConfirm) onConfirm(transcript);
                onClose();
              }}
              style={styles.pauseCircle}
            >
              <MaterialCommunityIcons
                name={isRecording ? 'pause' : 'microphone'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const ORB_SIZE = Math.min(width * 0.55, 220);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'space-between',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  orbWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
    marginBottom: 36,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomBar: {
    alignItems: 'center',
    gap: 24,
  },
  waveform: {
    width: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  controlCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE6DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F1115',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
