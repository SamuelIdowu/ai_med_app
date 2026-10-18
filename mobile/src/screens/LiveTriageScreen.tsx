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
  Image,
} from 'react-native';
import { getIllustration } from '../assets/illustrations';
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
import { VitalsService, VitalsTriageResponse } from '../services/vitalsService';
import { EncounterService } from '../services/encounterService';

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

  // Mode: 'symptoms' (SSE Chat/Guide) or 'vitals' (Scikit-Learn ML)
  const [triageMode, setTriageMode] = useState<'symptoms' | 'vitals'>('symptoms');

  const [query, setQuery] = useState(props.initialQuery || route.params?.initialQuery || '');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [streamedText, setStreamedText] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [offlineGuides, setOfflineGuides] = useState<OfflineGuide[]>([]);

  // Vitals State
  const [hr, setHr] = useState('80');
  const [sysBp, setSysBp] = useState('120');
  const [diaBp, setDiaBp] = useState('80');
  const [spo2, setSpo2] = useState('98');
  const [rr, setRr] = useState('16');
  const [temp, setTemp] = useState('37.0');
  const [pain, setPain] = useState('0');
  const [bleeding, setBleeding] = useState(false);
  const [altered, setAltered] = useState(false);
  const [vitalsResult, setVitalsResult] = useState<VitalsTriageResponse | null>(null);
  const [evaluatingVitals, setEvaluatingVitals] = useState(false);

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

  const handleEvaluateVitals = async () => {
    setEvaluatingVitals(true);
    try {
      const result = await VitalsService.evaluateVitalsTriage({
        heart_rate: parseFloat(hr) || 80,
        systolic_bp: parseFloat(sysBp) || 120,
        diastolic_bp: parseFloat(diaBp) || 80,
        oxygen_saturation: parseFloat(spo2) || 98,
        respiratory_rate: parseFloat(rr) || 16,
        body_temperature: parseFloat(temp) || 37.0,
        pain_score: parseInt(pain, 10) || 0,
        severe_bleeding: bleeding ? 1 : 0,
        altered_mental_status: altered ? 1 : 0,
      });
      setVitalsResult(result);
      if (result.is_emergency) {
        setIsCritical(true);
      }
    } catch (err) {
      console.error('Error evaluating vitals triage:', err);
    } finally {
      setEvaluatingVitals(false);
    }
  };

  const handleSaveAndPreviewReport = async () => {
    if (!vitalsResult) return;
    try {
      const vitalsPayload = {
        heart_rate: parseFloat(hr) || 80,
        systolic_bp: parseFloat(sysBp) || 120,
        diastolic_bp: parseFloat(diaBp) || 80,
        oxygen_saturation: parseFloat(spo2) || 98,
        respiratory_rate: parseFloat(rr) || 16,
        body_temperature: parseFloat(temp) || 37.0,
        pain_score: parseInt(pain, 10) || 0,
        severe_bleeding: bleeding ? 1 : 0,
        altered_mental_status: altered ? 1 : 0,
        triage_label: vitalsResult.triage_label,
        triage_level: vitalsResult.triage_level,
        risk_drivers: vitalsResult.risk_drivers,
      };

      const notes = `Clinical Vitals Triage Evaluation: ${vitalsResult.triage_label} (Confidence: ${Math.round(
        vitalsResult.confidence * 100
      )}%). ${vitalsResult.risk_drivers.length > 0 ? `Risk Drivers: ${vitalsResult.risk_drivers.join(', ')}` : 'No acute red flags.'}`;

      const result = await EncounterService.createEncounter(
        'Vitals Triage',
        notes,
        [],
        vitalsPayload
      );

      const reportId = result.backendEncounter?.id || result.localId;
      navigation.navigate('ReportPreview', { encounterId: reportId });
    } catch (err) {
      console.error('Failed to create encounter from vitals triage:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header bar */}
      <View style={styles.header}>
        {getIllustration('emergencyBeacon') && (
          <Image
            source={getIllustration('emergencyBeacon')!}
            style={styles.headerBackgroundImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.headerOverlay}>
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
      </View>

      {/* Mode Switcher Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, triageMode === 'symptoms' && styles.tabButtonActive]}
          onPress={() => setTriageMode('symptoms')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="chat-processing-outline"
            size={16}
            color={triageMode === 'symptoms' ? '#FFFFFF' : theme.colors.text.secondary}
          />
          <Text
            style={[styles.tabButtonText, triageMode === 'symptoms' && styles.tabButtonTextActive]}
          >
            Symptom Stream
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, triageMode === 'vitals' && styles.tabButtonActive]}
          onPress={() => setTriageMode('vitals')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="heart-pulse"
            size={16}
            color={triageMode === 'vitals' ? '#FFFFFF' : theme.colors.text.secondary}
          />
          <Text
            style={[styles.tabButtonText, triageMode === 'vitals' && styles.tabButtonTextActive]}
          >
            Vitals ML Triage
          </Text>
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
              subtitle="Red-flag clinical signs identified. Call emergency services immediately."
              onCallEmergency={() => Linking.openURL('tel:911')}
            />
          )}

          {triageMode === 'symptoms' ? (
            <>
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
            </>
          ) : (
            /* Vitals ML Triage Form & Assessment */
            <View style={styles.vitalsContainer}>
              <Text style={styles.sectionHeader}>Patient Physiological Vitals</Text>
              <Text style={styles.sectionSub}>
                Enter bedside observations to evaluate triage urgency via Classical Scikit-Learn ML.
              </Text>

              <View style={styles.vitalsGrid}>
                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>Heart Rate (bpm)</Text>
                  <TextInput
                    style={styles.vitalInput}
                    value={hr}
                    onChangeText={setHr}
                    keyboardType="numeric"
                    placeholder="80"
                  />
                </View>

                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>Oxygen SpO2 (%)</Text>
                  <TextInput
                    style={styles.vitalInput}
                    value={spo2}
                    onChangeText={setSpo2}
                    keyboardType="numeric"
                    placeholder="98"
                  />
                </View>

                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>Systolic BP (mmHg)</Text>
                  <TextInput
                    style={styles.vitalInput}
                    value={sysBp}
                    onChangeText={setSysBp}
                    keyboardType="numeric"
                    placeholder="120"
                  />
                </View>

                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>Diastolic BP (mmHg)</Text>
                  <TextInput
                    style={styles.vitalInput}
                    value={diaBp}
                    onChangeText={setDiaBp}
                    keyboardType="numeric"
                    placeholder="80"
                  />
                </View>

                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>Resp Rate (/min)</Text>
                  <TextInput
                    style={styles.vitalInput}
                    value={rr}
                    onChangeText={setRr}
                    keyboardType="numeric"
                    placeholder="16"
                  />
                </View>

                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>Temp (°C)</Text>
                  <TextInput
                    style={styles.vitalInput}
                    value={temp}
                    onChangeText={setTemp}
                    keyboardType="numeric"
                    placeholder="37.0"
                  />
                </View>
              </View>

              {/* Acute Observation Toggles */}
              <Text style={[styles.sectionHeader, { marginTop: 12 }]}>Acute Clinical Red Flags</Text>
              <View style={styles.flagToggleRow}>
                <TouchableOpacity
                  style={[styles.flagToggle, bleeding && styles.flagToggleActiveRed]}
                  onPress={() => setBleeding(!bleeding)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="water-alert"
                    size={16}
                    color={bleeding ? '#FFFFFF' : '#EF4444'}
                  />
                  <Text style={[styles.flagToggleText, bleeding && styles.flagToggleTextActive]}>
                    Severe Active Bleeding
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.flagToggle, altered && styles.flagToggleActiveAmber]}
                  onPress={() => setAltered(!altered)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="head-alert-outline"
                    size={16}
                    color={altered ? '#FFFFFF' : '#F59E0B'}
                  />
                  <Text style={[styles.flagToggleText, altered && styles.flagToggleTextActive]}>
                    Altered Mental Status
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.evaluateVitalsButton, evaluatingVitals && styles.disabledButton]}
                onPress={handleEvaluateVitals}
                disabled={evaluatingVitals}
                activeOpacity={0.8}
              >
                {evaluatingVitals ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFFFFF" />
                    <Text style={styles.evaluateVitalsButtonText}>Score Vitals via Classical ML</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Vitals Assessment Card */}
              {vitalsResult && (
                <View
                  style={[
                    styles.vitalsResultCard,
                    vitalsResult.is_emergency
                      ? styles.resultCardEmergency
                      : vitalsResult.is_urgent
                      ? styles.resultCardUrgent
                      : styles.resultCardNormal,
                  ]}
                >
                  <View style={styles.resultHeader}>
                    <View>
                      <Text style={styles.resultBadgeLabel}>TRIAGE CLASSIFICATION</Text>
                      <Text
                        style={[
                          styles.resultClassification,
                          vitalsResult.is_emergency
                            ? { color: '#DC2626' }
                            : vitalsResult.is_urgent
                            ? { color: '#D97706' }
                            : { color: '#16A34A' },
                        ]}
                      >
                        {vitalsResult.triage_label.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.confidenceText}>
                      {(vitalsResult.confidence * 100).toFixed(0)}% Conf
                    </Text>
                  </View>

                  {/* Probabilities Bars */}
                  {vitalsResult.probabilities && (
                    <View style={styles.probabilitySection}>
                      <Text style={styles.probSectionHeader}>Model Confidence Distribution</Text>
                      {Object.entries(vitalsResult.probabilities).map(([cls, prob]) => (
                        <View key={cls} style={styles.probRow}>
                          <Text style={styles.probLabel}>{cls}</Text>
                          <View style={styles.probBarTrack}>
                            <View
                              style={[
                                styles.probBarFill,
                                {
                                  width: `${Math.round(prob * 100)}%`,
                                  backgroundColor:
                                    cls === 'Emergency'
                                      ? '#EF4444'
                                      : cls === 'Urgent'
                                      ? '#F59E0B'
                                      : '#22C55E',
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.probPercent}>{(prob * 100).toFixed(0)}%</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Risk Drivers */}
                  {vitalsResult.risk_drivers && vitalsResult.risk_drivers.length > 0 && (
                    <View style={styles.riskDriversBox}>
                      <Text style={styles.riskDriversHeader}>Clinical Risk Drivers & Thresholds</Text>
                      {vitalsResult.risk_drivers.map((driver, idx) => (
                        <View key={idx} style={styles.riskDriverRow}>
                          <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
                          <Text style={styles.riskDriverText}>{driver}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.saveReportButton}
                    onPress={handleSaveAndPreviewReport}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="file-document-edit-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveReportButtonText}>Save & Preview Medical Report</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Input Bar for Symptoms Mode */}
        {triageMode === 'symptoms' && (
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
        )}
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  headerBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.18,
  },
  headerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#0F1115',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  vitalsContainer: {
    marginBottom: 20,
  },
  sectionSub: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vitalInputBox: {
    width: '48%',
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  vitalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  vitalInput: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    padding: 0,
  },
  flagToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 14,
  },
  flagToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  flagToggleActiveRed: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  flagToggleActiveAmber: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
  },
  flagToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  flagToggleTextActive: {
    color: '#FFFFFF',
  },
  evaluateVitalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F1115',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 16,
    ...theme.spatial.shadows.card,
  },
  evaluateVitalsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vitalsResultCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginTop: 6,
    ...theme.spatial.shadows.card,
  },
  resultCardEmergency: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  resultCardUrgent: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FBBF24',
  },
  resultCardNormal: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  resultBadgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: theme.colors.text.secondary,
  },
  resultClassification: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.secondary,
  },
  probabilitySection: {
    marginTop: 6,
    marginBottom: 12,
  },
  probSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  probRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  probLabel: {
    width: 85,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  probBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  probBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  probPercent: {
    width: 38,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    textAlign: 'right',
  },
  riskDriversBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  riskDriversHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  riskDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  riskDriverText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  saveReportButton: {
    marginTop: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveReportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
