import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

/**
 * Universal voice and speech service supporting both Native (iOS/Android) and Web (Chrome/Edge/Safari)
 */
export const VoiceService = {
  /**
   * Speaks the given text verbally with natural pacing and tone
   */
  speak(text: string, onDone?: () => void): void {
    if (!text || !text.trim()) return;

    this.stop();

    // 1. Web Speech Synthesis fallback for web browser runtimes
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        if (onDone) {
          utterance.onend = () => onDone();
          utterance.onerror = () => onDone();
        }
        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn('[VoiceService] Web speechSynthesis failed, falling back to expo-speech:', err);
      }
    }

    // 2. Expo Speech for native devices or supported runtimes
    try {
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.95,
        onDone: onDone,
        onError: () => {
          if (onDone) onDone();
        },
      });
    } catch (err) {
      console.warn('[VoiceService] Speech.speak failed:', err);
      if (onDone) onDone();
    }
  },

  /**
   * Immediately halts any active speech synthesis
   */
  stop(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
    try {
      Speech.stop();
    } catch (e) {
      // ignore
    }
  },

  /**
   * Checks if speech recognition is available in the current environment
   */
  isRecognitionAvailable(): boolean {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }
    return false;
  },
};
