import { Icon } from '../components/Icon';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BottomTabBar } from '../components/BottomTabBar';
import { MedicalCard } from '../components/ui/MedicalCard';
import { VitalsAreaChart } from '../components/charts/VitalsAreaChart';
import { TimeSegmentControl, TimeSegment } from '../components/charts/TimeSegmentControl';
import { TactileButton } from '../components/ui/TactileButton';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { EncounterService } from '../services/encounterService';
import { reportService } from '../services/reportService';
import { VitalsService, VitalsTelemetry } from '../services/vitalsService';
import { supabase } from '../services/supabase';
import { HealthDataService } from '../services/healthDataService';
import { theme } from '../theme';

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { session, signOut } = useAuth();
  const [encounters, setEncounters] = useState<any[]>([]);
  const [vitals, setVitals] = useState<VitalsTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<TimeSegment>('Hourly');
  const [activeTab, setActiveTab] = useState<'vitals' | 'activity'>('vitals');
  const [selectedEncounter, setSelectedEncounter] = useState<any | null>(null);
  const [healthSyncing, setHealthSyncing] = useState(false);
  const [healthSyncEnabled, setHealthSyncEnabled] = useState(false);
  const [healthSyncMessage, setHealthSyncMessage] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    loadVitals(activeSegment);
  }, [activeSegment]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`vital-readings:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vital_readings', filter: `user_id=eq.${userId}` },
        () => { void loadVitals(activeSegment); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [session?.user?.id, activeSegment]);

  const loadHistory = async () => {
    try {
      const data = await EncounterService.getEncounters();
      setEncounters(data || []);
    } catch (error) {
      console.warn('Error loading encounters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVitals = async (segment: TimeSegment) => {
    try {
      const data = await VitalsService.getVitalsTelemetry(segment);
      setVitals(data);
    } catch (error) {
      console.warn('Error loading vitals telemetry:', error);
    }
  };

  const connectHealthData = async () => {
    if (!session?.access_token) {
      Alert.alert('Sign In Required', 'Sign in before connecting health data so readings can be saved to your account.');
      return;
    }
    setHealthSyncing(true);
    setHealthSyncMessage('');
    try {
      const count = await HealthDataService.connectAndSync();
      setHealthSyncEnabled(true);
      setHealthSyncMessage(count > 0
        ? `Health data sync complete. ${count} readings processed.`
        : 'No readings were available. Check health permissions and connected data sources.');
      await loadVitals(activeSegment);
    } catch (error: any) {
      setHealthSyncMessage(error?.message || 'Could not sync health data.');
    } finally {
      setHealthSyncing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (!healthSyncEnabled || !session?.access_token) return undefined;
    let syncing = false;
    const syncRecentData = async () => {
      if (syncing || AppState.currentState !== 'active') return;
      syncing = true;
      try {
        await HealthDataService.syncGrantedData();
        await loadVitals(activeSegment);
      } catch (error) {
        console.warn('Health data background refresh failed:', error);
      } finally {
        syncing = false;
      }
    };
    void syncRecentData();
    const timer = setInterval(() => { void syncRecentData(); }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [healthSyncEnabled, activeSegment, session?.access_token]));

  const handleGenerateReport = async (encounterId: string) => {
    try {
      if (!session) {
        Alert.alert(
          'Sign In Required',
          'Sign in to generate official medical PDF reports.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => { void signOut(); } },
          ]
        );
        return;
      }

      setLoading(true);
      const reportUri = await reportService.generateReport(encounterId);
      setLoading(false);

      Alert.alert(
        'Report Generated',
        'Clinical triage summary PDF is ready.',
        [
          {
            text: 'Share PDF',
            onPress: async () => {
              try {
                await reportService.shareReport(reportUri);
              } catch (e) {
                console.error('Error sharing report:', e);
              }
            },
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', 'Failed to generate medical PDF report.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* 1. Header (Analytics from arch.webp & ref4.webp) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('vitals')}
            style={[
              styles.tabTogglePill,
              activeTab === 'vitals' && styles.activeTabToggle,
            ]}
          >
            <Text
              style={[
                styles.tabToggleText,
                activeTab === 'vitals' && styles.activeTabText,
              ]}
            >
              Vitals
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('activity')}
            style={[
              styles.tabTogglePill,
              activeTab === 'activity' && styles.activeTabToggle,
            ]}
          >
            <Text
              style={[
                styles.tabToggleText,
                activeTab === 'activity' && styles.activeTabText,
              ]}
            >
              Encounters ({encounters.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'vitals' ? (
          <>
          <View style={styles.healthSyncRow}>
            <View style={styles.healthSyncCopy}>
              <Text style={styles.cardSectionTitle}>Connected health data</Text>
              <Text style={styles.metricStatus}>Read-only sync from Apple Health or Health Connect</Text>
            </View>
            <TouchableOpacity
              style={[styles.healthSyncButton, healthSyncing && styles.healthSyncButtonDisabled]}
              onPress={connectHealthData}
              disabled={healthSyncing}
            >
              {healthSyncing
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.healthSyncButtonText}>Connect / Sync</Text>}
            </TouchableOpacity>
          </View>
          {healthSyncMessage ? <Text style={styles.healthSyncMessage}>{healthSyncMessage}</Text> : null}
          {!vitals || vitals.readingCount === 0 ? (
            <MedicalCard style={styles.emptyCard}>
              <Icon name="heartbeat" size={40} color={theme.colors.text.muted} />
              <Text style={styles.emptyTitle}>{vitals ? 'No heart-rate readings' : 'Readings unavailable'}</Text>
              <Text style={styles.emptySubtitle}>
                {vitals
                  ? 'Connect Apple Health or Health Connect, or record measured vitals during a triage session.'
                  : 'Could not load your readings. Check your connection and try again.'}
              </Text>
            </MedicalCard>
          ) : (
          <>
            {/* 2. Top Summary Metric Card (ref 2.webp) */}
            <MedicalCard style={styles.vitalsSummaryCard}>
              <View style={styles.vitalsHeaderRow}>
                <View>
                  <View style={styles.metricSubRow}>
                    <Text style={styles.metricSub}>Heart Rate</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricValue}>
                      {vitals?.currentHeartRate ?? '—'}
                    </Text>
                    <Text style={styles.metricUnit}>BPM</Text>
                  </View>
                  <Text style={styles.metricStatus}>
                    {vitals.heartRateStatus}
                  </Text>
                </View>

                <View style={styles.heartIconCircle}>
                  <Icon
                    name="cpr"
                    size={24}
                    color={theme.colors.primary.main}
                  />
                </View>
              </View>

              {/* Area Chart with Vertical Pin from ref 2 */}
              <VitalsAreaChart
                height={170}
                data={vitals?.heartRatePoints}
                highlightIndex={vitals ? Math.max(0, vitals.heartRatePoints.length - 1) : 0}
                highlightLabel={vitals ? `${vitals.currentHeartRate} BPM` : '—'}
              />

              {/* 3-Column Stats: Average | Minimum | Maximum (ref 2) */}
              <View style={styles.threeColRow}>
                <View style={styles.colStat}>
                  <Text style={styles.colLabel}>Average</Text>
                  <Text style={styles.colValue}>{vitals?.average ?? '—'}</Text>
                  <Text style={styles.colUnit}>BPM</Text>
                </View>
                <View style={styles.colDivider} />
                <View style={styles.colStat}>
                  <Text style={styles.colLabel}>Minimum</Text>
                  <Text style={styles.colValue}>{vitals?.min ?? '—'}</Text>
                  <Text style={styles.colUnit}>BPM</Text>
                </View>
                <View style={styles.colDivider} />
                <View style={styles.colStat}>
                  <Text style={styles.colLabel}>Maximum</Text>
                  <Text style={styles.colValue}>{vitals?.max ?? '—'}</Text>
                  <Text style={styles.colUnit}>BPM</Text>
                </View>
              </View>

              {/* Time Segment Control: Hourly | Daily | Weekly | Monthly */}
              <TimeSegmentControl
                activeSegment={activeSegment}
                onChange={setActiveSegment}
                style={styles.segmentControl}
              />
            </MedicalCard>

          </>
          )}
          </>
        ) : (
          /* Encounters & History Tab */
          <View style={styles.activitySection}>
            <Text style={styles.sectionHeader}>Emergency & Triage Encounters</Text>

            {loading ? (
              <ActivityIndicator
                size="large"
                color={theme.colors.primary.main}
                style={{ marginTop: 24 }}
              />
            ) : encounters.length === 0 ? (
              <MedicalCard style={styles.emptyCard}>
                <Icon
                  name="clipboardText"
                  size={40}
                  color={theme.colors.text.muted}
                />
                <Text style={styles.emptyTitle}>No past encounters</Text>
                <Text style={styles.emptySubtitle}>
                  Emergency checks and triage sessions will appear here with downloadable clinician reports.
                </Text>
              </MedicalCard>
            ) : (
              encounters.map((enc) => (
                <MedicalCard
                  key={enc.id}
                  style={styles.encounterCard}
                  onPress={() => navigation.navigate('ReportPreview', { encounterId: enc.id })}
                >
                  <View style={styles.encounterRow}>
                    <View style={styles.encIconCircle}>
                      <Icon
                        name="firstAidKit"
                        size={22}
                        color={theme.colors.primary.main}
                      />
                    </View>
                    <View style={styles.encContent}>
                      <Text style={styles.encCategory}>
                        {enc.category || 'Emergency First Aid'}
                      </Text>
                      <Text style={styles.encNotes} numberOfLines={2}>
                        {enc.notes || (enc.symptoms?.length ? enc.symptoms.join(', ') : 'Clinical triage assessment recorded')}
                      </Text>
                      <Text style={styles.encDate}>
                        {new Date(enc.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.encActionsRow}>
                    <TactileButton
                      label="View Details"
                      variant="primary"
                      size="sm"
                      icon="fileText"
                      onPress={() => navigation.navigate('ReportPreview', { encounterId: enc.id })}
                    />
                    <TactileButton
                      label="PDF Report"
                      variant="outline"
                      size="sm"
                      icon="filePdf"
                      onPress={() => handleGenerateReport(enc.id)}
                    />
                  </View>
                </MedicalCard>
              ))
            )}
          </View>
        )}

        {/* Space for bottom floating nav pill */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating Bottom Nav Pill */}
      <BottomTabBar activeRoute="History" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.background,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: theme.spatial.spacing.md,
    paddingBottom: 12,
    backgroundColor: theme.colors.canvas.background,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    borderRadius: theme.spatial.radii.pill,
    padding: 3,
  },
  tabTogglePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.spatial.radii.pill,
  },
  activeTabToggle: {
    backgroundColor: '#111318',
  },
  tabToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spatial.spacing.md,
    paddingTop: 12,
  },
  healthSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.canvas.surface,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
  },
  healthSyncCopy: {
    flex: 1,
    gap: 4,
  },
  healthSyncButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary.main,
  },
  healthSyncButtonDisabled: {
    opacity: 0.6,
  },
  healthSyncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  healthSyncMessage: {
    marginHorizontal: 4,
    marginBottom: 10,
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  vitalsSummaryCard: {
    padding: theme.spatial.spacing.md,
    marginBottom: 16,
  },
  vitalsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metricSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricSub: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 2,
  },
  metricValue: {
    ...theme.typography.metricDisplay,
    fontSize: 34,
    color: theme.colors.text.primary,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginLeft: 6,
  },
  metricStatus: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  heartIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threeColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.surfaceSubtle,
    borderRadius: theme.spatial.radii.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 14,
  },
  colStat: {
    alignItems: 'center',
    flex: 1,
  },
  colLabel: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginBottom: 2,
  },
  colValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  colUnit: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  colDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.canvas.border,
  },
  segmentControl: {
    marginTop: 4,
  },
  chartSectionCard: {
    padding: theme.spatial.spacing.md,
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  cardHeaderWithBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeNorm: {
    backgroundColor: theme.colors.status.success.surface,
    borderColor: theme.colors.status.success.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.spatial.radii.pill,
  },
  badgeNormText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.status.success.text,
  },
  activitySection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  encounterCard: {
    padding: 14,
    marginBottom: 12,
  },
  encounterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  encIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  encContent: {
    flex: 1,
  },
  encCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  encNotes: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  encDate: {
    fontSize: 11,
    color: theme.colors.text.muted,
  },
  encActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.canvas.border,
    paddingTop: 8,
  },
});
