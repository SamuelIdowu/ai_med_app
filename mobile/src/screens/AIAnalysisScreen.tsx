import { Icon } from '../components/Icon';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { reportService } from '../services/reportService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageService } from '../services/imageService';
import { photoAnalysisService } from '../services/photoAnalysisService';
import { capturePhoto, PhotoCaptureError, pickPhoto } from '../services/photoCaptureService';
import { getApiErrorMessage } from '../services/apiError';
import {
  PhotoAnalysisFallbackReason,
  PhotoAnalysisMode,
  StructuredPhotoAnalysis,
} from '../types/photoAnalysis';
import { theme, withAlpha } from '../theme';
import { Illustration } from '../components/Illustration';

const PRIMARY_COLOR = theme.colors.primary.main;
const BG_LIGHT = theme.colors.canvas.background;
const CARD_LIGHT = theme.colors.canvas.surface;
const TEXT_LIGHT = theme.colors.text.primary;
const TEXT_SECONDARY = theme.colors.text.secondary;

const ANALYSIS_MODES: Array<{
  id: PhotoAnalysisMode;
  label: string;
  description: string;
}> = [
  { id: 'auto', label: 'Auto', description: 'Best available model' },
  { id: 'wound', label: 'Wound CV', description: 'Wound severity model' },
  { id: 'general', label: 'General AI', description: 'Broader assessment' },
];

export const AIAnalysisScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialPhotoUri = route.params?.photoUri as string | undefined;
  const initialMode = (route.params?.mode as PhotoAnalysisMode) || 'auto';
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [images, setImages] = useState<string[]>(initialPhotoUri ? [initialPhotoUri] : []);
  const [analysisMode, setAnalysisMode] = useState<PhotoAnalysisMode>(initialMode);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [structuredAnalysis, setStructuredAnalysis] = useState<StructuredPhotoAnalysis | null>(
    null,
  );
  const [fallbackReason, setFallbackReason] = useState<PhotoAnalysisFallbackReason | undefined>();
  const [reportUri, setReportUri] = useState<string | null>(null);
  const autoStartedRef = useRef(false);

  // --- Animated progress bar ---
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const pulseDot = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // scaleX keeps the fill animation on the GPU (layout-free) instead of
    // animating width off-thread.
    Animated.timing(animatedProgress, {
      toValue: Math.max(uploadProgress / 100, 0.001),
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [uploadProgress, animatedProgress]);

  useEffect(() => {
    if (analyzing) {
      // Shimmer sweep
      shimmerAnim.setValue(-1);
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 2,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
      // Pulse dot
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseDot, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseDot, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      shimmerAnim.stopAnimation();
      pulseDot.stopAnimation();
      pulseDot.setValue(1);
    }
  }, [analyzing, shimmerAnim, pulseDot]);

  const selectPhoto = async (newImage: string) => {
    setProcessingStage('Validating image quality...');
    const quality = await ImageService.validateImageQuality(newImage);

    if (!quality.isValid) {
      Alert.alert('Image Quality Issue', quality.warnings.join('\n'), [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Anyway',
          onPress: () => {
            setImages([newImage]);
            setAnalysisResult(null);
            setStructuredAnalysis(null);
            setReportUri(null);
          },
        },
      ]);
      setProcessingStage('');
      return;
    }

    if (quality.warnings.length > 0) {
      Alert.alert('Image Quality', quality.warnings.join('\n'));
    }

    setImages([newImage]);
    setAnalysisResult(null);
    setStructuredAnalysis(null);
    setFallbackReason(undefined);
    setReportUri(null);
    setProcessingStage('');
  };

  const pickImage = async () => {
    try {
      const newImage = await pickPhoto();
      await selectPhoto(newImage);
    } catch (error) {
      if (error instanceof PhotoCaptureError && error.code !== 'cancelled') {
        Alert.alert('Permission needed', error.message);
      }
    }
  };

  const takePhoto = async () => {
    try {
      const newImage = await capturePhoto();
      await selectPhoto(newImage);
    } catch (error) {
      if (error instanceof PhotoCaptureError && error.code !== 'cancelled') {
        Alert.alert('Permission needed', error.message);
      }
    }
  };

  const handleShareReport = async () => {
    if (reportUri) {
      await reportService.shareReport(reportUri);
    }
  };

  const handleReset = () => {
    setImages([]);
    setAnalysisResult(null);
    setStructuredAnalysis(null);
    setFallbackReason(undefined);
    setReportUri(null);
    setUploadProgress(0);
    setProcessingStage('');
  };

  const handleAnalyze = async (photoUriOverride?: string, modeOverride?: PhotoAnalysisMode) => {
    const photoUri = photoUriOverride ?? images[0];
    if (!photoUri) return;

    const mode = modeOverride ?? analysisMode;
    setAnalyzing(true);
    setUploadProgress(10);

    try {
      setProcessingStage('Preparing photo...');
      setUploadProgress(30);

      setProcessingStage(
        mode === 'general' ? 'Running general AI analysis...' : 'Running clinical analysis...',
      );
      setUploadProgress(55);

      const result = await photoAnalysisService.analyze(photoUri, mode);

      setUploadProgress(85);
      setProcessingStage('Saving encounter...');

      let generatedReportUri: string | null = null;
      try {
        generatedReportUri = await reportService.generateReport(result.encounterId);
        setReportUri(generatedReportUri);
      } catch (reportError) {
        console.error('Report generation failed', reportError);
      }

      setImages([photoUri]);
      setAnalysisResult(result.analysis);
      setStructuredAnalysis(result.structuredAnalysis);
      setFallbackReason(result.fallbackReason);
      setUploadProgress(100);
      setProcessingStage('Complete!');

      const successButtons: any[] = generatedReportUri
        ? [
            {
              text: 'Share Report',
              onPress: async () => {
                if (generatedReportUri) {
                  await reportService.shareReport(generatedReportUri);
                }
                navigation.navigate('History');
              },
            },
            { text: 'Done', onPress: () => navigation.navigate('History') },
          ]
        : [{ text: 'Done', onPress: () => navigation.navigate('History') }];

      Alert.alert(
        'Analysis Complete',
        'Your assessment has been saved to history.',
        successButtons,
      );
    } catch (error: any) {
      console.error('API Error', error?.response?.data || error);
      Alert.alert('Analysis Failed', getApiErrorMessage(error));
    } finally {
      setAnalyzing(false);
      setUploadProgress(0);
      setProcessingStage('');
    }
  };

  useEffect(() => {
    if (initialPhotoUri && !autoStartedRef.current) {
      autoStartedRef.current = true;
      void handleAnalyze(initialPhotoUri, initialMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="caretLeft" size={28} color={TEXT_LIGHT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Analysis</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Headline & Status */}
        <View style={styles.headlineContainer}>
          <View style={styles.headlineRow}>
            <Text style={styles.headlineText}>Assess Injury</Text>
            <View style={styles.offlineChip}>
              <Icon name="cloudCheck" size={16} color={theme.colors.status.success.text} />
              <Text style={styles.offlineText}>ONLINE AI</Text>
            </View>
          </View>
          <Text style={styles.subtext}>
            {analysisResult
              ? 'Review your assessment below.'
              : 'Snap a photo of the affected area. Our AI will analyze the injury and save it to your history.'}
          </Text>
        </View>

        {!analysisResult && (
          <View style={styles.modeSection}>
            <Text style={styles.modeLabel}>Analysis mode</Text>
            <View style={styles.modeRow}>
              {ANALYSIS_MODES.map((option) => {
                const selected = analysisMode === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.modeChip, selected && styles.modeChipSelected]}
                    onPress={() => setAnalysisMode(option.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.modeChipText, selected && styles.modeChipTextSelected]}>
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.modeChipDescription,
                        selected && styles.modeChipDescriptionSelected,
                      ]}
                    >
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Progress Indicator */}
        {analyzing && (
          <View style={styles.progressContainer}>
            {/* Stage label with pulsing dot */}
            <View style={styles.progressLabelRow}>
              <Animated.View style={[styles.pulseDot, { opacity: pulseDot }]} />
              <Text style={styles.progressText}>{processingStage}</Text>
            </View>

            {/* Track */}
            <View style={styles.progressBar}>
              {/* Animated fill (scaleX from left edge) */}
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: '100%',
                    transformOrigin: 'left center',
                    transform: [{ scaleX: animatedProgress }],
                  },
                ]}
              >
                {/* Shimmer sweep overlay */}
                <Animated.View
                  style={[
                    styles.shimmer,
                    {
                      transform: [
                        {
                          translateX: shimmerAnim.interpolate({
                            inputRange: [-1, 2],
                            outputRange: [-80, 200],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </Animated.View>
            </View>

            {/* Percentage */}
            <Animated.Text style={styles.progressPercent}>
              {uploadProgress.toFixed(0)}%
            </Animated.Text>
          </View>
        )}

        {analysisResult ? (
          <View style={styles.resultContainer}>
            {/* Image Gallery */}
            <ScrollView
              horizontal
              style={styles.imageGallery}
              showsHorizontalScrollIndicator={false}
            >
              {images.map((img, index) => (
                <View key={index} style={styles.galleryImageContainer}>
                  <Image source={{ uri: img }} style={styles.galleryImage} />
                </View>
              ))}
            </ScrollView>

            {/* ---- Structured Analysis Card ---- */}
            {structuredAnalysis ? (
              <View style={styles.resultCard}>
                {/* Emergency Banner */}
                {structuredAnalysis.emergencyFlag && (
                  <View style={styles.emergencyBanner}>
                    <Icon name="warningCircle" size={20} color="#fff" />
                    <Text style={styles.emergencyText}>⚠️ EMERGENCY — Call 911 Immediately</Text>
                  </View>
                )}

                {fallbackReason && (
                  <View style={styles.fallbackBanner}>
                    <Icon name="arrowsLeftRight" size={16} color={theme.colors.ramp.gray500} />
                    <Text style={styles.fallbackText}>
                      Auto mode used General AI ({formatFallbackReason(fallbackReason)}).
                    </Text>
                  </View>
                )}

                {/* Severity + Classification */}
                <View style={styles.severityRow}>
                  <View style={[styles.severityBadge, severityStyle(structuredAnalysis.severity)]}>
                    <Text style={styles.severityBadgeText}>
                      {structuredAnalysis.severity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.injuryTypeText}>
                    {formatClassification(structuredAnalysis.classification)}
                  </Text>
                </View>

                {/* Confidence */}
                <View style={styles.confidenceRow}>
                  <Text style={styles.sectionLabel}>Confidence</Text>
                  <Text style={styles.confidenceValue}>{structuredAnalysis.confidence}%</Text>
                </View>
                <View style={styles.confidenceBarBg}>
                  <View
                    style={[
                      styles.confidenceBarFill,
                      { width: `${structuredAnalysis.confidence}%` },
                    ]}
                  />
                </View>

                {/* Symptoms */}
                {structuredAnalysis.symptoms.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Icon name="eye" size={18} color={PRIMARY_COLOR} />
                      <Text style={styles.sectionTitle}>Observed Symptoms</Text>
                    </View>
                    {structuredAnalysis.symptoms.map((s, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.bulletText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recommendations */}
                {structuredAnalysis.recommendations.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Icon
                        name="firstAidKit"
                        size={18}
                        color={theme.colors.status.success.primary}
                      />
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: theme.colors.status.success.primary },
                        ]}
                      >
                        First Aid Steps
                      </Text>
                    </View>
                    {structuredAnalysis.recommendations.map((r, i) => (
                      <View key={i} style={styles.stepRow}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>{i + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Warnings */}
                {structuredAnalysis.warnings.length > 0 && (
                  <View style={[styles.section, styles.warningSection]}>
                    <View style={styles.sectionHeader}>
                      <Icon name="warning" size={18} color={theme.colors.status.warning.primary} />
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: theme.colors.status.warning.primary },
                        ]}
                      >
                        Important Warnings
                      </Text>
                    </View>
                    {structuredAnalysis.warnings.map((w, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Icon
                          name="warningCircle"
                          size={14}
                          color={theme.colors.status.warning.primary}
                          style={{ marginTop: 2 }}
                        />
                        <Text
                          style={[styles.bulletText, { color: theme.colors.status.warning.text }]}
                        >
                          {w}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              /* Fallback plain text */
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Assessment Result</Text>
                <Text style={styles.resultText}>{analysisResult}</Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              {reportUri && (
                <TouchableOpacity style={styles.cameraButton} onPress={handleShareReport}>
                  <Icon name="share" size={20} color="#fff" />
                  <Text style={styles.cameraButtonText}>Share PDF Report</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.galleryButton} onPress={handleReset}>
                <Icon name="arrowClockwise" size={20} color={TEXT_LIGHT} />
                <Text style={styles.galleryButtonText}>Start New Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Upload Area */
          <View style={styles.uploadContainer}>
            {images.length > 0 ? (
              <View style={styles.singleImagePreview}>
                <Image source={{ uri: images[0] }} style={styles.singlePreviewImage} />
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <Icon name="image" size={16} color="#fff" />
                  <Text style={styles.changePhotoText}>Change photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Empty State */
              <TouchableOpacity style={styles.uploadBox} activeOpacity={0.8} onPress={pickImage}>
                <View style={styles.uploadIconCircle}>
                  <Illustration
                    name="diagnosticMolecule"
                    width={64}
                    height={64}
                    accessibilityLabel="Diagnostic molecule"
                    fallback={<Icon name="cameraPlus" size={40} color={PRIMARY_COLOR} />}
                  />
                </View>
                <Text style={styles.uploadTitle}>No Image Selected</Text>
                <Text style={styles.uploadSubtitle}>Tap to capture or upload</Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                <Icon name="camera" size={20} color="#fff" />
                <Text style={styles.cameraButtonText}>Open Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
                <Icon name="image" size={20} color={TEXT_LIGHT} />
                <Text style={styles.galleryButtonText}>Select from Gallery</Text>
              </TouchableOpacity>

              {images.length > 0 && (
                <TouchableOpacity
                  style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
                  disabled={analyzing}
                  onPress={() => handleAnalyze()}
                >
                  {analyzing ? (
                    <>
                      <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                      <Text
                        style={[styles.analyzeButtonText, { color: theme.colors.text.inverse }]}
                      >
                        Analyzing...
                      </Text>
                    </>
                  ) : (
                    <>
                      <LinearGradient
                        colors={[theme.colors.ramp.ink, theme.colors.ramp.inkElev]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                      <Icon name="scan" size={24} color="#fff" style={{ zIndex: 1 }} />
                      <Text
                        style={[
                          styles.analyzeButtonText,
                          { color: theme.colors.text.inverse, zIndex: 1 },
                        ]}
                      >
                        Analyze Photo
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Nav Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('AIChat')}>
          <Icon name="chatCircle" size={24} color={theme.colors.ramp.gray400} />
          <Text style={styles.navText}>Chat</Text>
        </TouchableOpacity>

        <View style={styles.scanTabContainer}>
          <TouchableOpacity
            style={[
              styles.scanButton,
              images.length > 0 && { backgroundColor: theme.colors.ramp.ink },
            ]}
            disabled={analyzing}
            onPress={() => (images.length > 0 ? handleAnalyze() : pickImage())}
          >
            {analyzing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="scan" size={24} color="#fff" />
            )}
            {images.length > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{images.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.scanText}>Scan</Text>
        </View>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('FirstAidList')}
        >
          <Icon name="bookOpen" size={24} color={theme.colors.ramp.gray400} />
          <Text style={styles.navText}>Guides</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const formatClassification = (classification: string): string => {
  if (!classification) return 'General Assessment';
  return classification.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatFallbackReason = (reason: PhotoAnalysisFallbackReason): string => {
  const labels: Record<PhotoAnalysisFallbackReason, string> = {
    ml_unavailable: 'wound model unavailable',
    ml_error: 'wound model error',
    non_medical: 'non-medical image',
    low_confidence: 'low wound-model confidence',
  };
  return labels[reason];
};

const severityStyle = (severity: StructuredPhotoAnalysis['severity']) => {
  const map: Record<StructuredPhotoAnalysis['severity'], object> = {
    none: { backgroundColor: theme.colors.ramp.gray100, borderColor: theme.colors.ramp.gray200 },
    mild: { backgroundColor: theme.colors.ramp.gray100, borderColor: theme.colors.ramp.gray200 },
    moderate: {
      backgroundColor: theme.colors.ramp.gray100,
      borderColor: theme.colors.ramp.gray300,
    },
    severe: { backgroundColor: theme.colors.ramp.gray200, borderColor: theme.colors.ramp.gray400 },
    critical: { backgroundColor: theme.colors.ramp.ink, borderColor: theme.colors.ramp.ink },
  };
  return map[severity] || map.moderate;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_LIGHT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: withAlpha(theme.colors.ramp.white, 0.95),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_LIGHT,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 130,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  headlineContainer: {
    marginBottom: 20,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headlineText: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT_LIGHT,
  },
  offlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.status.success.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.status.success.border,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.status.success.text,
    letterSpacing: 0.5,
  },
  subtext: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },
  modeSection: {
    marginBottom: 18,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: theme.colors.canvas.surface,
  },
  modeChipSelected: {
    backgroundColor: theme.colors.ramp.ink,
    borderColor: theme.colors.ramp.ink,
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_LIGHT,
    marginBottom: 2,
  },
  modeChipTextSelected: {
    color: theme.colors.text.inverse,
  },
  modeChipDescription: {
    fontSize: 10,
    lineHeight: 13,
    color: TEXT_SECONDARY,
  },
  modeChipDescriptionSelected: {
    color: theme.colors.ramp.gray300,
  },
  fallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.ramp.gray50,
    borderWidth: 1,
    borderColor: theme.colors.ramp.gray200,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  fallbackText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: TEXT_SECONDARY,
  },
  uploadContainer: {
    flex: 1,
    marginBottom: 24,
  },
  uploadBox: {
    width: '100%',
    minHeight: 220,
    borderWidth: 2,
    borderColor: theme.colors.status.emergency.surface,
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: theme.colors.canvas.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  uploadIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: withAlpha(theme.colors.status.emergency.primary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_LIGHT,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: theme.colors.ramp.gray500,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 12,
  },
  actionButtons: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
    marginBottom: 12,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    height: 48,
    borderRadius: 8,
    gap: 8,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '700',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas.surface,
    height: 48,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.ramp.gray200,
  },
  galleryButtonText: {
    color: TEXT_LIGHT,
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSection: {
    gap: 16,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26, // Pill shape
    gap: 12,
    overflow: 'hidden', // For gradient
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 4,
  },
  analyzeButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: theme.colors.ramp.gray100,
  },
  analyzeButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: theme.colors.ramp.gray400,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
    alignSelf: 'center',
    marginTop: 8,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.canvas.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ramp.gray100,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 72,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    shadowColor: theme.colors.ramp.black,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 50,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  navText: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.ramp.gray400,
    marginTop: 4,
  },
  scanTabContainer: {
    position: 'relative',
    top: -18,
    alignItems: 'center',
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: BG_LIGHT,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanText: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginTop: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.ramp.ink,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.ramp.white,
  },
  badgeText: {
    color: theme.colors.text.inverse,
    fontSize: 10,
    fontWeight: '800',
  },
  resultContainer: {
    flex: 1,
    marginBottom: 32,
  },
  resultCard: {
    backgroundColor: CARD_LIGHT,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    ...theme.spatial.shadows3d.level1,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_LIGHT,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    lineHeight: 24,
  },
  imagePreviewContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.ramp.gray200,
  },
  resultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  progressContainer: {
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 20,
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.colors.ramp.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_COLOR,
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: theme.colors.status.emergency.surface,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: withAlpha(theme.colors.ramp.white, 0.35),
    borderRadius: 6,
    transform: [{ skewX: '-20deg' }],
  },
  progressText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '500',
    flex: 1,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    textAlign: 'right',
    marginTop: 2,
  },
  imageGallery: {
    marginBottom: 20,
    maxHeight: 120,
  },
  galleryImageContainer: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.ramp.gray200,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  singleImagePreview: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: theme.colors.ramp.gray100,
  },
  singlePreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changePhotoButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: withAlpha(theme.colors.ramp.ink, 0.78),
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  changePhotoText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: '700',
  },
  imageGalleryPreview: {
    marginBottom: 20,
    maxHeight: 180,
  },
  imagePreviewItem: {
    position: 'relative',
    width: 150,
    height: 150,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImageThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: withAlpha(theme.colors.ramp.black, 0.6),
    borderRadius: 12,
  },
  addMoreButton: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.ramp.gray200,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.ramp.gray50,
  },
  addMoreText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 8,
    fontWeight: '600',
  },

  // ── Structured Analysis Card ─────────────────────────────
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.status.danger,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    ...theme.spatial.shadows3d.level1,
  },
  emergencyText: {
    color: theme.colors.text.inverse,
    fontWeight: '700',
    fontSize: 14,
    flexShrink: 1,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
    color: theme.colors.ramp.gray800,
  },
  injuryTypeText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_LIGHT,
    flexShrink: 1,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_LIGHT,
  },
  confidenceBarBg: {
    height: 6,
    backgroundColor: theme.colors.ramp.gray200,
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: theme.colors.ramp.ink,
    borderRadius: 3,
  },
  section: {
    marginTop: 4,
    marginBottom: 16,
  },
  warningSection: {
    backgroundColor: theme.colors.ramp.gray50,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.ramp.gray200,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_LIGHT,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY_COLOR,
    marginTop: 7,
  },
  bulletText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.ramp.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 21,
    flex: 1,
  },
});
