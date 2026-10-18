import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  SafeAreaView,
  Image,
} from 'react-native';
import { getIllustration } from '../assets/illustrations';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import firstAidData from '../content/first-aid-content.json';
import { EncounterService } from '../services/encounterService';
import { theme } from '../theme';

type RootStackParamList = {
  EmergencySteps: { categoryId: string };
  EmergencySummary: { categoryId: string; encounterId: string };
};

type EmergencyStepsRouteProp = RouteProp<RootStackParamList, 'EmergencySteps'>;

export const EmergencyStepScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<EmergencyStepsRouteProp>();
  const { categoryId } = route.params;

  // View mode: 'overview' vs 'step'
  const [viewMode, setViewMode] = useState<'overview' | 'step'>('overview');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [rating, setRating] = useState(5);

  // Find category in local offline JSON or fallback
  const category = (firstAidData.categories.find((c) => c.id === categoryId) as any) ||
    firstAidData.categories[0] || {
      id: categoryId,
      title: 'Emergency Care',
      subtitle: 'Immediate First Aid',
      icon: 'medical-bag',
      warning: 'Call emergency services (911) immediately if victim is unresponsive.',
      steps: [
        {
          step_number: 1,
          title: 'Ensure Scene Safety',
          content: 'Verify the environment is safe before administering first aid.',
          explanation: 'Personal safety is paramount to prevent multiple casualties.',
          illustration_icon: 'shield-alert',
          illustration_label: 'Safety Check',
        },
      ],
    };

  const steps = category.steps || [];
  const currentStep = steps[currentStepIndex] || {};
  const totalSteps = steps.length;
  const isCprProtocol = category.id === 'cpr' || /cpr|cardiopulmonary/i.test(category.title || '');

  const rawTitle = category.title || 'First Aid';
  const headerTitle = rawTitle.toLowerCase().endsWith('aid')
    ? rawTitle
    : `${rawTitle} protocol`;

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setShowCompletionModal(true);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    } else {
      setViewMode('overview');
    }
  };

  const handleFinishGuide = async () => {
    setShowCompletionModal(false);
    try {
      const encounterId = await EncounterService.createEncounter(
        category.title,
        `Completed emergency protocol for ${category.title} with rating ${rating}/5`,
        []
      );
      navigation.navigate('EmergencySummary', { categoryId, encounterId });
    } catch (e) {
      navigation.navigate('EmergencySummary', { categoryId, encounterId: 'local_enc' });
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="dark" />

      {/* ─── Top Header (Common to both views) ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (viewMode === 'step') {
              setViewMode('overview');
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backCircle}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* ─── SCREEN 1: Overview Mode ─── */}
      {viewMode === 'overview' ? (
        <View style={styles.contentWrapper}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Medical Illustration Hero Card (Replaces Video) */}
            <View style={styles.illustrationHeroCard}>
              <View style={styles.heroIconBadge}>
                {isCprProtocol && getIllustration('cprGuide') ? (
                  <Image
                    source={getIllustration('cprGuide')!}
                    style={styles.heroCprImage}
                    resizeMode="contain"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name={(category.icon as any) || 'medical-bag'}
                    size={44}
                    color="#0F1115"
                  />
                )}
              </View>

              <Text style={styles.heroProtocolName}>{category.title}</Text>
              <Text style={styles.heroSubtitle}>{category.subtitle || 'Clinical Protocol'}</Text>

              {/* Protocol Spec Badges */}
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroPill}>
                  <MaterialCommunityIcons name="format-list-numbered" size={14} color="#0F1115" />
                  <Text style={styles.heroPillText}>{totalSteps} Detailed Steps</Text>
                </View>

                {category.urgency ? (
                  <View style={styles.heroPillAlert}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#0F1115" />
                    <Text style={styles.heroPillAlertText}>{category.urgency}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Critical Emergency Warning Banner */}
            {category.warning && (
              <View style={styles.criticalWarningBox}>
                <MaterialCommunityIcons name="alert-decagram" size={22} color="#0F1115" />
                <View style={styles.criticalWarningContent}>
                  <Text style={styles.criticalWarningTitle}>Crucial Medical Notice</Text>
                  <Text style={styles.criticalWarningText}>{category.warning}</Text>
                </View>
              </View>
            )}

            {/* First Aid Steps Section Header */}
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading}>Emergency Step Instructions</Text>
              <Text style={styles.sectionStepCounter}>{totalSteps} Steps</Text>
            </View>

            {/* Step Capsules List (Tapping opens specific step) */}
            <View style={styles.stepListContainer}>
              {steps.map((st: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => {
                    setCurrentStepIndex(idx);
                    setViewMode('step');
                  }}
                  style={styles.stepCapsuleRow}
                >
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                  </View>

                  <View style={styles.stepCapsuleTextCol}>
                    <Text style={styles.stepCapsuleTitle} numberOfLines={1}>
                      {st.title}
                    </Text>
                    <Text style={styles.stepCapsulePreview} numberOfLines={2}>
                      {st.content}
                    </Text>
                  </View>

                  <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Sticky Bottom Actions: Ask AI Triage & Start Step by Step */}
          <View style={styles.bottomActionBar}>
            <TouchableOpacity
              style={styles.pillButtonOutline}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AIChat')}
            >
              <MaterialCommunityIcons name="robot" size={18} color="#0F1115" />
              <Text style={styles.pillButtonOutlineText}>Ask AI Triage</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pillButtonSolid}
              activeOpacity={0.85}
              onPress={() => {
                setCurrentStepIndex(0);
                setViewMode('step');
              }}
            >
              <Text style={styles.pillButtonSolidText}>Start Instructions</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ─── SCREEN 2: Step-by-Step Instruction Mode (Detailed Instructions & Illustrations) ─── */
        <View style={styles.contentWrapper}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Step Progress Header */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressStepLabel}>
                  Step {currentStepIndex + 1} of {totalSteps}
                </Text>
                <Text style={styles.progressStepName} numberOfLines={1}>
                  {category.title}
                </Text>
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${((currentStepIndex + 1) / totalSteps) * 100}%` },
                  ]}
                />
              </View>
            </View>

            {/* Step Title Header */}
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepHeaderBadge}>
                <Text style={styles.stepHeaderBadgeText}>
                  {currentStepIndex + 1}
                </Text>
              </View>
              <Text style={styles.stepHeaderTitle}>
                {currentStep.title || `Step ${currentStepIndex + 1}`}
              </Text>
            </View>

            {/* Step Medical Illustration Card (No Video) */}
            <View style={styles.stepIllustrationCard}>
              <View style={styles.stepIllustrationCircle}>
                <MaterialCommunityIcons
                  name={(currentStep.illustration_icon as any) || (category.icon as any) || 'medical-bag'}
                  size={52}
                  color="#0F1115"
                />
              </View>
              <Text style={styles.stepIllustrationLabel}>
                {currentStep.illustration_label || 'Medical Step Visual Guide'}
              </Text>
            </View>

            {/* Detailed Medical Instructions */}
            <View style={styles.stepDescriptionSection}>
              <Text style={styles.stepInstructionSectionTitle}>Action Directive</Text>
              <Text style={styles.stepPrimaryContent}>
                {currentStep.content}
              </Text>

              {/* Clinical Explanation & Mechanism */}
              {currentStep.explanation && (
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationTitle}>Clinical Rationale:</Text>
                  <Text style={styles.explanationText}>
                    {currentStep.explanation}
                  </Text>
                </View>
              )}

              {/* Safety Caution / Do's & Don'ts */}
              {currentStep.caution && (
                <View style={styles.cautionBox}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color="#0F1115" />
                  <View style={styles.cautionContent}>
                    <Text style={styles.cautionTitle}>Critical Warning:</Text>
                    <Text style={styles.cautionText}>{currentStep.caution}</Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Sticky Bottom Actions: < Previous & Next > */}
          <View style={styles.bottomActionBar}>
            <TouchableOpacity
              style={styles.pillButtonOutline}
              activeOpacity={0.8}
              onPress={handlePrevious}
            >
              <Text style={styles.pillButtonOutlineText}>&lt; Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pillButtonSolid}
              activeOpacity={0.85}
              onPress={handleNext}
            >
              <Text style={styles.pillButtonSolidText}>
                {currentStepIndex === totalSteps - 1 ? 'Finish Protocol' : 'Next Step >'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Completion Modal (Black & White) ─── */}
      <Modal
        visible={showCompletionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.feedbackModalCard}>
            <View style={styles.modalCheckCircle}>
              <MaterialCommunityIcons name="check" size={32} color="#FFFFFF" />
            </View>

            <Text style={styles.feedbackTitle}>
              Protocol Complete
            </Text>
            <Text style={styles.feedbackSub}>
              Guidance completed for {category.title}. Confirm encounter to save clinical record.
            </Text>

            {/* High-contrast rating */}
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  style={styles.starTouch}
                >
                  <MaterialCommunityIcons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color="#000000"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalSubmitButton}
              activeOpacity={0.85}
              onPress={handleFinishGuide}
            >
              <Text style={styles.modalSubmitButtonText}>
                Confirm & Log Encounter
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 38 : 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  backCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F1115',
    maxWidth: '70%',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },

  // Overview Medical Illustration Hero Card
  illustrationHeroCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  heroIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  heroCprImage: {
    width: 76,
    height: 76,
  },
  heroProtocolName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F1115',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F1115',
  },
  heroPillAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.canvas.surfaceSubtle,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.status.emergency.border,
  },
  heroPillAlertText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.status.emergency.primary,
  },

  // Critical Warning Banner (Vivid Medical Red with 3D Emergency Glow)
  criticalWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.status.emergency.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.status.emergency.border,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    ...theme.spatial.shadows3d.emergencyGlow,
  },
  criticalWarningContent: {
    flex: 1,
  },
  criticalWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.status.emergency.primary,
    marginBottom: 2,
  },
  criticalWarningText: {
    fontSize: 13,
    color: theme.colors.status.emergency.text,
    lineHeight: 18,
    fontWeight: '600',
  },

  // Steps Section Header
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  sectionStepCounter: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },

  // Step Capsule Row with 3D Depth
  stepListContainer: {
    gap: 10,
  },
  stepCapsuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    padding: 14,
    gap: 12,
    ...theme.spatial.shadows3d.card3d,
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepCapsuleTextCol: {
    flex: 1,
  },
  stepCapsuleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F1115',
    marginBottom: 2,
  },
  stepCapsulePreview: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  // Step Mode Progress
  progressContainer: {
    marginBottom: 18,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStepLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F1115',
  },
  progressStepName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    maxWidth: '60%',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0F1115',
  },

  // Step Header
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stepHeaderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F1115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeaderBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepHeaderTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F1115',
    flex: 1,
  },

  // Step Illustration Card
  stepIllustrationCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  stepIllustrationCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepIllustrationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
  },

  // Detailed Description
  stepDescriptionSection: {
    marginBottom: 16,
  },
  stepInstructionSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  stepPrimaryContent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F1115',
    lineHeight: 24,
    marginBottom: 16,
  },
  explanationBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F1115',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  cautionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#0F1115',
    gap: 10,
  },
  cautionContent: {
    flex: 1,
  },
  cautionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F1115',
    marginBottom: 2,
  },
  cautionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F1115',
    lineHeight: 18,
  },

  // Bottom Sticky Action Bar
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
    gap: 12,
  },
  pillButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#0F1115',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  pillButtonOutlineText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F1115',
  },
  pillButtonSolid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#0F1115',
    gap: 8,
  },
  pillButtonSolidText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  feedbackModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  modalCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F1115',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F1115',
    marginBottom: 6,
    textAlign: 'center',
  },
  feedbackSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  starRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  starTouch: {
    padding: 4,
  },
  modalSubmitButton: {
    width: '100%',
    backgroundColor: '#0F1115',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
