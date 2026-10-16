import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { EmergencyBanner } from '../components/ui/EmergencyBanner';
import { SymptomChip } from '../components/ui/SymptomChip';
import { streamTriage, parseSSELine } from '../services/streamingClient';
import { offlineStorage, OfflineGuide } from '../services/offlineStorage';
import { supabase } from '../services/supabase';

const COMMON_SYMPTOMS = [
  'Bleeding',
  'Chest Pain',
  'Shortness of Breath',
  'Burn',
  'Choking',
  'Allergic Reaction',
  'Fracture',
  'Dizziness',
];

interface LiveTriageScreenProps {
  encounterId?: string;
  apiBaseUrl?: string;
  initialQuery?: string;
}

export const LiveTriageScreen: React.FC<LiveTriageScreenProps> = (props) => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const encounterId = props.encounterId || route.params?.encounterId || `enc-live-${Date.now()}`;
  const apiBaseUrl =
    props.apiBaseUrl ||
    route.params?.apiBaseUrl ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    'http://localhost:3000/api/v1';

  const [query, setQuery] = useState(props.initialQuery || route.params?.initialQuery || '');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [streamedText, setStreamedText] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [offlineGuides, setOfflineGuides] = useState<OfflineGuide[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (streamedText) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [streamedText]);

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleStartStream = async (overridePrompt?: string) => {
    const textToSend = overridePrompt ?? query;
    if (!textToSend.trim() && selectedSymptoms.length === 0) return;
    if (loading) return;

    setLoading(true);
    setStreamedText('');
    setIsCritical(false);
    setIsOfflineFallback(false);
    setOfflineGuides([]);

    // Check critical flags from selected symptoms upfront
    const redFlags = ['Chest Pain', 'Shortness of Breath', 'Allergic Reaction', 'Choking'];
    if (selectedSymptoms.some((s) => redFlags.includes(s))) {
      setIsCritical(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      let receivedAny = false;

      await streamTriage({
        encounterId,
        query: textToSend.trim() || `Symptoms: ${selectedSymptoms.join(', ')}`,
        symptoms: selectedSymptoms,
        apiBaseUrl,
        authToken,
        onDelta: (delta) => {
          receivedAny = true;
          setStreamedText((prev) => prev + delta);
        },
        onCritical: (critical) => {
          if (critical) setIsCritical(true);
        },
        onDone: () => {
          setLoading(false);
        },
        onError: async (err) => {
          console.warn('Streaming error encountered, initiating offline fallback:', err);
          if (!receivedAny) {
            await triggerOfflineFallback(textToSend);
          }
          setLoading(false);
        },
      });
    } catch (err) {
      console.warn('Network stream failed, switching to pre-cached offline guides:', err);
      await triggerOfflineFallback(textToSend);
      setLoading(false);
    }
  };

  const triggerOfflineFallback = async (searchQuery: string) => {
    setIsOfflineFallback(true);
    const searchTerm = searchQuery.trim() || selectedSymptoms.join(' ') || 'emergency';
    const matches = await offlineStorage.searchOfflineGuides(searchTerm);
    setOfflineGuides(matches);

    // Save offline encounter to outbox queue
    await offlineStorage.queueOfflineEncounter({
      id: encounterId,
      chiefComplaint: searchQuery || 'Symptom triage',
      symptoms: selectedSymptoms,
      severity: isCritical ? 'critical' : 'moderate',
      createdAt: Date.now(),
    });

    if (matches.length > 0) {
      const formatted = matches
        .map(
          (g) =>
            `### ⚡ ${g.topic} (${g.category.toUpperCase()})\n${
              g.warning ? `> **Warning**: ${g.warning}\n\n` : ''
            }${g.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}`
        )
        .join('\n\n---\n\n');
      setStreamedText(formatted);
    } else {
      setStreamedText(
        `### Offline Mode Active\nNo network connection detected. For life-threatening emergencies, immediately dial **911** or contact your local hospital.`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Live Clinical Triage</Text>
          <View style={styles.statusIndicatorRow}>
            <View
              style={[
                styles.statusDot,
                isOfflineFallback ? styles.statusDotOffline : styles.statusDotOnline,
              ]}
            />
            <Text style={styles.statusLabel}>
              {isOfflineFallback ? 'Offline Protocol Active' : 'Real-Time SSE Stream'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => Linking.openURL('tel:911')}
          style={styles.sosButton}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="phone" size={16} color="#FFFFFF" />
          <Text style={styles.sosText}>911</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Emergency Red Escalation Banner */}
          {isCritical && (
            <EmergencyBanner
              title="Immediate Emergency Detected"
              subtitle="Red-flag symptoms identified. Call emergency services immediately."
              onCallEmergency={() => Linking.openURL('tel:911')}
            />
          )}

          {/* Quick Symptoms Multi-Selector */}
          <Text style={styles.sectionHeader}>Quick Symptom Selector</Text>
          <View style={styles.symptomRow}>
            {COMMON_SYMPTOMS.map((sym) => (
              <SymptomChip
                key={sym}
                label={sym}
                selected={selectedSymptoms.includes(sym)}
                onToggle={() => toggleSymptom(sym)}
                style={styles.chipSpacing}
              />
            ))}
          </View>

          {/* Streamed Output Card */}
          <View style={styles.streamCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <MaterialCommunityIcons
                  name="stethoscope"
                  size={18}
                  color={theme.colors.primary.main}
                />
                <Text style={styles.cardTitle}>Clinical Guidance Feed</Text>
              </View>
              {loading && <ActivityIndicator size="small" color={theme.colors.primary.main} />}
            </View>

            {streamedText ? (
              <Markdown style={markdownStyles}>{streamedText}</Markdown>
            ) : (
              <Text style={styles.placeholder}>
                Select symptoms above or describe what happened in the input bar below. Real-time step-by-step guidance will stream here immediately.
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Describe emergency symptoms..."
            placeholderTextColor={theme.colors.text.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleStartStream()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.disabledButton]}
            onPress={() => handleStartStream()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="arrow-up" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const markdownStyles = {
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text.primary,
  },
  heading3: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  strong: {
    fontWeight: '700' as const,
    color: theme.colors.text.primary,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  blockquote: {
    backgroundColor: '#F3F4F6',
    borderLeftColor: '#0F1115',
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 6,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.canvas.border,
    backgroundColor: theme.colors.canvas.surface,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusDotOnline: {
    backgroundColor: '#10B981',
  },
  statusDotOffline: {
    backgroundColor: '#F59E0B',
  },
  statusLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F1115',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  symptomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  chipSpacing: {
    marginRight: 8,
    marginBottom: 8,
  },
  streamCard: {
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    minHeight: 220,
    ...theme.spatial.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  placeholder: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.canvas.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.canvas.border,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#F9FAFB',
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: '#0F1115',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
