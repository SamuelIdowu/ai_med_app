import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBar } from '../components/BottomTabBar';
import { MedicalCard } from '../components/ui/MedicalCard';
import { VitalsAreaChart } from '../components/charts/VitalsAreaChart';
import { ConcentricVitalsRing } from '../components/charts/ConcentricVitalsRing';
import { ClinicalBarChart } from '../components/charts/ClinicalBarChart';
import { TimeSegmentControl, TimeSegment } from '../components/charts/TimeSegmentControl';
import { TactileButton } from '../components/ui/TactileButton';
import { useAuth } from '../context/AuthContext';
import { EncounterService } from '../services/encounterService';
import { reportService } from '../services/reportService';
import { theme } from '../theme';

export const HistoryScreen: React.FC = () => {
  const { session } = useAuth();
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<TimeSegment>('Hourly');
  const [activeTab, setActiveTab] = useState<'vitals' | 'activity'>('vitals');
  const [selectedEncounter, setSelectedEncounter] = useState<any | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

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

  const handleGenerateReport = async (encounterId: string) => {
    try {
      if (!session) {
        Alert.alert('Sign In Required', 'Sign in to generate official medical PDF reports.');
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
            {/* 2. Top Summary Metric Card (ref 2.webp) */}
            <MedicalCard style={styles.vitalsSummaryCard}>
              <View style={styles.vitalsHeaderRow}>
                <View>
                  <Text style={styles.metricSub}>Heart Rate</Text>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricValue}>78</Text>
                    <Text style={styles.metricUnit}>BPM</Text>
                  </View>
                  <Text style={styles.metricStatus}>Near to average (±80)</Text>
                </View>

                <View style={styles.heartIconCircle}>
                  <MaterialCommunityIcons
                    name="heart-pulse"
                    size={24}
                    color={theme.colors.primary.main}
                  />
                </View>
              </View>

              {/* Area Chart with Vertical Pin from ref 2 */}
              <VitalsAreaChart
                height={170}
                highlightIndex={2}
                highlightLabel="78 BPM"
              />

              {/* 3-Column Stats: Average | Minimum | Maximum (ref 2) */}
              <View style={styles.threeColRow}>
                <View style={styles.colStat}>
                  <Text style={styles.colLabel}>Average</Text>
                  <Text style={styles.colValue}>78</Text>
                  <Text style={styles.colUnit}>BPM</Text>
                </View>
                <View style={styles.colDivider} />
                <View style={styles.colStat}>
                  <Text style={styles.colLabel}>Minimum</Text>
                  <Text style={styles.colValue}>58</Text>
                  <Text style={styles.colUnit}>BPM</Text>
                </View>
                <View style={styles.colDivider} />
                <View style={styles.colStat}>
                  <Text style={styles.colLabel}>Maximum</Text>
                  <Text style={styles.colValue}>89</Text>
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

            {/* 3. Sleep & Biometric Multi-Ring Donut (ref3.webp) */}
            <MedicalCard style={styles.chartSectionCard}>
              <Text style={styles.cardSectionTitle}>Sleep & Recovery Arc</Text>
              <ConcentricVitalsRing
                size={130}
                strokeWidth={9}
                centerText="8.2h"
                centerSubtext="Sleep time"
              />
            </MedicalCard>

            {/* 4. Hemoglobin & Vitals Bar Chart (ref3.webp) */}
            <MedicalCard style={styles.chartSectionCard}>
              <View style={styles.cardHeaderWithBadge}>
                <Text style={styles.cardSectionTitle}>Hemoglobin (Hgb)</Text>
                <View style={styles.badgeNorm}>
                  <Text style={styles.badgeNormText}>112 Hgb Normal</Text>
                </View>
              </View>
              <ClinicalBarChart height={160} />
            </MedicalCard>
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
                <MaterialCommunityIcons
                  name="clipboard-check-outline"
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
                <MedicalCard key={enc.id} style={styles.encounterCard}>
                  <View style={styles.encounterRow}>
                    <View style={styles.encIconCircle}>
                      <MaterialCommunityIcons
                        name="medical-bag"
                        size={22}
                        color={theme.colors.primary.main}
                      />
                    </View>
                    <View style={styles.encContent}>
                      <Text style={styles.encCategory}>
                        {enc.category || 'Emergency First Aid'}
                      </Text>
                      <Text style={styles.encNotes} numberOfLines={2}>
                        {enc.notes || 'General triage assistance logged.'}
                      </Text>
                      <Text style={styles.encDate}>
                        {new Date(enc.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.encActionsRow}>
                    <TactileButton
                      label="PDF Report"
                      variant="outline"
                      size="sm"
                      icon="file-pdf-box"
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
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.canvas.border,
    paddingTop: 8,
  },
});
