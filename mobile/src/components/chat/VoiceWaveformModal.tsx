import { Icon } from '../Icon';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RhythmWaveform } from '../charts/RhythmWaveform';
import { VoiceService } from '../../services/voiceService';
import { OrganicFluidSphere } from '../ui/OrganicFluidSphere';
import { theme } from '../../theme';

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
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <Icon name="close" size={20} color={theme.colors.ramp.slate900} />
          </TouchableOpacity>

          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isAgentSpeaking ? theme.colors.status.info.primary : theme.colors.status.success.primary },
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
            activeColor={isAgentSpeaking ? theme.colors.status.info.primary : theme.colors.ramp.ink}
            mutedColor={theme.colors.ramp.gray200}
            style={styles.waveform}
          />

          <View style={styles.controlsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              style={styles.controlCircle}
            >
              <Icon name="close" size={22} color={theme.colors.ramp.slate900} />
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
              <Icon
                name={transcript.trim().length > 0 ? 'arrowUp' : 'microphone'}
                size={26}
                color={theme.colors.ramp.white}
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
    backgroundColor: theme.colors.canvas.background,
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
    backgroundColor: theme.colors.canvas.surface,
    borderWidth: 1,
    borderColor: theme.colors.ramp.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.ramp.gray200,
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
    color: theme.colors.ramp.gray700,
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
    shadowColor: theme.colors.ramp.black,
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
    color: theme.colors.status.info.text,
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: theme.colors.status.info.surface,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.status.info.border,
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
    color: theme.colors.ramp.slate900,
    textAlign: 'center',
    fontWeight: '600',
  },
  placeholderText: {
    color: theme.colors.ramp.gray400,
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
    backgroundColor: theme.colors.canvas.surface,
    borderWidth: 1,
    borderColor: theme.colors.ramp.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.ramp.gray700,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.ramp.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  activeActionCircle: {
    backgroundColor: theme.colors.ramp.ink,
  },
  hintText: {
    fontSize: 12,
    color: theme.colors.ramp.gray500,
    fontWeight: '500',
  },
});
