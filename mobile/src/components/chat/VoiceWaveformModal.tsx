import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RhythmWaveform } from '../charts/RhythmWaveform';
import { VoiceService } from '../../services/voiceService';
import { OrganicFluidSphere } from '../ui/OrganicFluidSphere';

interface VoiceWaveformModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: (transcript: string) => void;
}

const INSTRUCTION_TEXT = "I'm listening. Describe your symptoms, pain level, or what occurred.";

export const VoiceWaveformModal: React.FC<VoiceWaveformModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Pulse animation for the glowing AI orb
  useEffect(() => {
    if (visible) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [visible, pulseAnim]);

  // Handle verbal agent instruction and speech recognition lifecycle
  useEffect(() => {
    if (!visible) {
      VoiceService.stop();
      stopRecognition();
      setTranscript('');
      setIsAgentSpeaking(false);
      setIsListening(false);
      return;
    }

    // 1. Agent starts with verbal instruction
    setIsAgentSpeaking(true);
    setTranscript('');

    const startListening = () => {
      setIsAgentSpeaking(false);
      setIsListening(true);
      initRecognition();
    };

    VoiceService.speak(INSTRUCTION_TEXT, () => {
      startListening();
    });

    // Safety timeout in case speech engine onDone doesn't fire
    const safetyTimer = setTimeout(() => {
      setIsAgentSpeaking(false);
      setIsListening(true);
      initRecognition();
    }, 4000);

    return () => {
      clearTimeout(safetyTimer);
      VoiceService.stop();
      stopRecognition();
    };
  }, [visible]);

  // Speech Recognition (Web Speech API for Chrome / Edge / Web & Mobile Web)
  const initRecognition = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          stopRecognition();
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (event: any) => {
            let fullText = '';
            for (let i = 0; i < event.results.length; i++) {
              fullText += event.results[i][0].transcript + ' ';
            }
            setTranscript(fullText.trim());
          };

          rec.onerror = (event: any) => {
            console.warn('[SpeechRecognition] Error:', event.error);
          };

          rec.onend = () => {
            // Restart if still in listening mode
            if (isListening && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // ignore
              }
            }
          };

          rec.start();
          recognitionRef.current = rec;
        } catch (err) {
          console.warn('[SpeechRecognition] Could not start:', err);
        }
      }
    }
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
  };

  const handleConfirm = () => {
    const cleanText = transcript.trim();
    if (!cleanText) {
      Alert.alert(
        'No Speech Detected',
        'Please speak your symptoms into the microphone before sending.'
      );
      return;
    }

    VoiceService.stop();
    stopRecognition();
    if (onConfirm) {
      onConfirm(cleanText);
    }
    onClose();
  };

  const handleClose = () => {
    VoiceService.stop();
    stopRecognition();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Top bar with close button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClose}
            style={styles.closeCircle}
          >
            <MaterialCommunityIcons name="close" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isAgentSpeaking ? '#3B82F6' : '#10B981' },
              ]}
            />
            <Text style={styles.statusText}>
              {isAgentSpeaking ? 'Agent Speaking...' : 'Listening to You...'}
            </Text>
          </View>
        </View>

        {/* Center Living Organic Fluid AI Sphere & Real-time Transcript */}
        <View style={styles.centerContainer}>
          <OrganicFluidSphere
            state={isAgentSpeaking ? 'thinking' : 'recording'}
            size={ORB_SIZE * 0.88}
            style={{ marginBottom: 12 }}
          />

          {isAgentSpeaking ? (
            <Text style={styles.instructionBanner}>{INSTRUCTION_TEXT}</Text>
          ) : (
            <View style={styles.transcriptBox}>
              <Text
                style={[
                  styles.transcriptText,
                  !transcript && styles.placeholderText,
                ]}
              >
                {transcript || 'Speak now... your symptoms will appear here in real time.'}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Soundwave & Action Bar */}
        <View style={styles.bottomBar}>
          <RhythmWaveform
            barCount={36}
            height={48}
            activeColor={isAgentSpeaking ? '#2563EB' : '#0F1115'}
            mutedColor="#E5E7EB"
            style={styles.waveform}
          />

          <View style={styles.controlsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              style={styles.controlCircle}
            >
              <MaterialCommunityIcons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>

            {/* Send Transcribed Speech Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleConfirm}
              style={[
                styles.actionCircle,
                transcript.trim().length > 0 && styles.activeActionCircle,
              ]}
            >
              <MaterialCommunityIcons
                name={transcript.trim().length > 0 ? 'arrow-up' : 'microphone'}
                size={26}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.hintText}>
            {transcript.trim().length > 0
              ? 'Tap arrow button to send to AI Triage'
              : 'Tap microphone to send when finished'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const windowWidth = Dimensions?.get ? (Dimensions.get('window')?.width ?? 375) : 375;
const ORB_SIZE = Math.min(windowWidth * 0.52, 210);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'space-between',
    paddingVertical: 44,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
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
    marginBottom: 28,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  instructionBanner: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1E3A8A',
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  transcriptBox: {
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  transcriptText: {
    fontSize: 17,
    lineHeight: 24,
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '600',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  bottomBar: {
    alignItems: 'center',
    gap: 16,
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
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  activeActionCircle: {
    backgroundColor: '#0F1115',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
