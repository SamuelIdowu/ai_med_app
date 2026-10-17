import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Animated, Easing, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { EncounterService } from '../services/encounterService';
import { StatusBar } from 'expo-status-bar';
import { reportService } from '../services/reportService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../services/api';
import { ImageService, ProcessedImage } from '../services/imageService';
import { theme } from '../theme';

interface StructuredAnalysis {
    severity: 'minor' | 'moderate' | 'serious' | 'critical';
    injuryType: string;
    confidence: number;
    emergencyFlag: boolean;
    symptoms: string[];
    recommendations: string[];
    warnings: string[];
    rawAnalysis?: string;
}

const PRIMARY_COLOR = theme.colors.primary.main;
const BG_LIGHT = theme.colors.canvas.background;
const CARD_LIGHT = theme.colors.canvas.surface;
const TEXT_LIGHT = theme.colors.text.primary;
const TEXT_SECONDARY = theme.colors.text.secondary;

export const AIAnalysisScreen = () => {
    const navigation = useNavigation<any>();
    const [analyzing, setAnalyzing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStage, setProcessingStage] = useState<string>('');
    const [images, setImages] = useState<string[]>([]);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [structuredAnalysis, setStructuredAnalysis] = useState<StructuredAnalysis | null>(null);
    const [reportUri, setReportUri] = useState<string | null>(null);

    // --- Animated progress bar ---
    const animatedProgress = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(-1)).current;
    const pulseDot = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(animatedProgress, {
            toValue: uploadProgress,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [uploadProgress]);

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
                })
            ).start();
            // Pulse dot
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseDot, { toValue: 0.3, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseDot, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            shimmerAnim.stopAnimation();
            pulseDot.stopAnimation();
            pulseDot.setValue(1);
        }
    }, [analyzing]);


    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
            allowsMultipleSelection: false, // For now, keep single selection for simplicity
        });

        if (!result.canceled) {
            const newImage = result.assets[0].uri;

            // Validate image quality
            setProcessingStage('Validating image quality...');
            const quality = await ImageService.validateImageQuality(newImage);

            if (!quality.isValid) {
                Alert.alert(
                    'Image Quality Issue',
                    quality.warnings.join('\n'),
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Use Anyway', onPress: () => setImages([...images, newImage]) }
                    ]
                );
                setProcessingStage('');
                return;
            }

            if (quality.warnings.length > 0) {
                Alert.alert('Image Quality', quality.warnings.join('\n'));
            }

            setImages([...images, newImage]);
            setAnalysisResult(null);
            setReportUri(null);
            setProcessingStage('');
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            const newImage = result.assets[0].uri;

            // Validate image quality
            setProcessingStage('Validating image quality...');
            const quality = await ImageService.validateImageQuality(newImage);

            if (!quality.isValid) {
                Alert.alert(
                    'Image Quality Issue',
                    quality.warnings.join('\n'),
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Use Anyway', onPress: () => setImages([...images, newImage]) }
                    ]
                );
                setProcessingStage('');
                return;
            }

            if (quality.warnings.length > 0) {
                Alert.alert('Image Quality', quality.warnings.join('\n'));
            }

            setImages([...images, newImage]);
            setAnalysisResult(null);
            setReportUri(null);
            setProcessingStage('');
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
        setReportUri(null);
        setUploadProgress(0);
        setProcessingStage('');
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleAnalyze = async () => {
        if (images.length === 0) return;

        setAnalyzing(true);
        setUploadProgress(0);

        try {
            setProcessingStage('Processing images...');
            setUploadProgress(20);

            // Process all images using ImageService
            const processedImages: ProcessedImage[] = [];
            for (let i = 0; i < images.length; i++) {
                const processed = await ImageService.processImage(images[i]);
                processedImages.push(processed);
                setUploadProgress(20 + (30 * (i + 1) / images.length));
            }

            setProcessingStage('Uploading to server...');
            setUploadProgress(50);

            // Send to backend - using the first image for now (single image analysis)
            // In Phase 2, we'll send all images
            const apiResponse = await api.post('/ai/analyze', {
                image: processedImages[0].base64
            });

            setUploadProgress(80);
            setProcessingStage('Creating encounter...');

            // Create encounter with all images
            const result = await EncounterService.createEncounter(
                'AI Analysis',
                apiResponse.data.analysis || 'Analysis Completed',
                images
            );

            setUploadProgress(100);
            setProcessingStage('Complete!');

            let successButtons: any[] = [{ text: 'OK', onPress: () => navigation.navigate('History') }];

            // If we have a backend encounter, we can generate a report
            if (result.backendEncounter && result.backendEncounter.id) {
                try {
                    const reportUri = await reportService.generateReport(result.backendEncounter.id);

                    successButtons = [
                        {
                            text: 'Share Report',
                            onPress: async () => {
                                await reportService.shareReport(reportUri);
                                navigation.navigate('History');
                            }
                        },
                        { text: 'Done', onPress: () => navigation.navigate('History') }
                    ];
                } catch (reportError) {
                    console.error("Report generation failed", reportError);
                    // Fallback to normal success if report fails
                }
            }

            // Capture structured analysis if available
            if (apiResponse.data.structuredAnalysis) {
                setStructuredAnalysis(apiResponse.data.structuredAnalysis);
            }
            setAnalysisResult(apiResponse.data.analysis);
            setProcessingStage('');

            if (result.backendEncounter?.id) {
                Alert.alert(
                    '✅ Analysis Complete',
                    'Your assessment has been saved to history.',
                    successButtons
                );
            }
        } catch (err: any) {
            console.error("API Error", err?.response?.data || err);
            Alert.alert('Analysis Failed', err?.response?.data?.userMessage || 'Could not analyze image.');
            setProcessingStage('');
        } finally {
            setAnalyzing(false);
            setUploadProgress(0);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <MaterialCommunityIcons name="chevron-left" size={28} color={TEXT_LIGHT} />
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
                            <MaterialCommunityIcons name="cloud-sync" size={16} color="#065f46" />
                            <Text style={styles.offlineText}>ONLINE AI</Text>
                        </View>
                    </View>
                    <Text style={styles.subtext}>
                        {analysisResult ? "Review your assessment below." : "Snap a photo of the affected area. Our AI will analyze the injury and save it to your history."}
                    </Text>
                </View>

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
                            {/* Animated fill */}
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: animatedProgress.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%'],
                                            extrapolate: 'clamp',
                                        }),
                                    },
                                ]}
                            >
                                {/* Shimmer sweep overlay */}
                                <Animated.View
                                    style={[
                                        styles.shimmer,
                                        {
                                            transform: [{
                                                translateX: shimmerAnim.interpolate({
                                                    inputRange: [-1, 2],
                                                    outputRange: [-80, 200],
                                                }),
                                            }],
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
                        <ScrollView horizontal style={styles.imageGallery} showsHorizontalScrollIndicator={false}>
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
                                        <MaterialCommunityIcons name="alert-circle" size={20} color="#fff" />
                                        <Text style={styles.emergencyText}>⚠️ EMERGENCY — Call 911 Immediately</Text>
                                    </View>
                                )}

                                {/* Severity + Injury Type */}
                                <View style={styles.severityRow}>
                                    <View style={[styles.severityBadge, severityStyle(structuredAnalysis.severity)]}>
                                        <Text style={styles.severityBadgeText}>{structuredAnalysis.severity.toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.injuryTypeText}>{structuredAnalysis.injuryType}</Text>
                                </View>

                                {/* Confidence */}
                                <View style={styles.confidenceRow}>
                                    <Text style={styles.sectionLabel}>Confidence</Text>
                                    <Text style={styles.confidenceValue}>{structuredAnalysis.confidence}%</Text>
                                </View>
                                <View style={styles.confidenceBarBg}>
                                    <View style={[styles.confidenceBarFill, { width: `${structuredAnalysis.confidence}%` }]} />
                                </View>

                                {/* Symptoms */}
                                {structuredAnalysis.symptoms.length > 0 && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <MaterialCommunityIcons name="eye-outline" size={18} color={PRIMARY_COLOR} />
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
                                            <MaterialCommunityIcons name="medical-bag" size={18} color="#059669" />
                                            <Text style={[styles.sectionTitle, { color: '#059669' }]}>First Aid Steps</Text>
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
                                            <MaterialCommunityIcons name="alert-outline" size={18} color="#d97706" />
                                            <Text style={[styles.sectionTitle, { color: '#d97706' }]}>Important Warnings</Text>
                                        </View>
                                        {structuredAnalysis.warnings.map((w, i) => (
                                            <View key={i} style={styles.bulletRow}>
                                                <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#d97706" style={{ marginTop: 2 }} />
                                                <Text style={[styles.bulletText, { color: '#92400e' }]}>{w}</Text>
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
                                    <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                                    <Text style={styles.cameraButtonText}>Share PDF Report</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.galleryButton} onPress={handleReset}>
                                <MaterialCommunityIcons name="refresh" size={20} color={TEXT_LIGHT} />
                                <Text style={styles.galleryButtonText}>Start New Scan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    /* Upload Area */
                    <View style={styles.uploadContainer}>
                        {images.length > 0 ? (
                            /* Image Gallery View */
                            <ScrollView horizontal style={styles.imageGalleryPreview} showsHorizontalScrollIndicator={false}>
                                {images.map((img, index) => (
                                    <View key={index} style={styles.imagePreviewItem}>
                                        <Image source={{ uri: img }} style={styles.previewImageThumb} />
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => removeImage(index)}
                                        >
                                            <MaterialCommunityIcons name="close-circle" size={24} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity
                                    style={styles.addMoreButton}
                                    onPress={pickImage}
                                >
                                    <MaterialCommunityIcons name="plus-circle-outline" size={40} color={PRIMARY_COLOR} />
                                    <Text style={styles.addMoreText}>Add More</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        ) : (
                            /* Empty State */
                            <TouchableOpacity
                                style={styles.uploadBox}
                                activeOpacity={0.8}
                                onPress={pickImage}
                            >
                                <View style={styles.uploadIconCircle}>
                                    <MaterialCommunityIcons name="camera-plus" size={40} color={PRIMARY_COLOR} />
                                </View>
                                <Text style={styles.uploadTitle}>No Image Selected</Text>
                                <Text style={styles.uploadSubtitle}>Tap to capture or upload</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                                <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                                <Text style={styles.cameraButtonText}>Open Camera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
                                <MaterialCommunityIcons name="image" size={20} color={TEXT_LIGHT} />
                                <Text style={styles.galleryButtonText}>Select from Gallery</Text>
                            </TouchableOpacity>

                            {images.length > 0 && (
                                <TouchableOpacity
                                    style={[
                                        styles.analyzeButton,
                                        analyzing && styles.analyzeButtonDisabled
                                    ]}
                                    disabled={analyzing}
                                    onPress={handleAnalyze}
                                >
                                    {analyzing ? (
                                        <>
                                            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={[styles.analyzeButtonText, { color: "#fff" }]}>Analyzing...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <LinearGradient
                                                colors={['#0F1115', '#262A33']}
                                                style={StyleSheet.absoluteFillObject}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                            />
                                            <MaterialCommunityIcons name="line-scan" size={24} color="#fff" style={{ zIndex: 1 }} />
                                            <Text style={[styles.analyzeButtonText, { color: "#fff", zIndex: 1 }]}>
                                                Scan & Analyze ({images.length})
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
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('AIChat')}
                >
                    <MaterialCommunityIcons name="message-text-outline" size={24} color="#9ca3af" />
                    <Text style={styles.navText}>Chat</Text>
                </TouchableOpacity>

                <View style={styles.scanTabContainer}>
                    <TouchableOpacity
                        style={[
                            styles.scanButton,
                            images.length > 0 && { backgroundColor: '#0F1115' }
                        ]}
                        disabled={analyzing}
                        onPress={() => images.length > 0 ? handleAnalyze() : pickImage()}
                    >
                        {analyzing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <MaterialCommunityIcons name="line-scan" size={24} color="#fff" />
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
                    <MaterialCommunityIcons name="book-open-variant" size={24} color="#9ca3af" />
                    <Text style={styles.navText}>Guides</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

const severityStyle = (severity: StructuredAnalysis['severity']) => {
    const map: Record<StructuredAnalysis['severity'], object> = {
        minor: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
        moderate: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
        serious: { backgroundColor: '#E5E7EB', borderColor: '#9CA3AF' },
        critical: { backgroundColor: '#0F1115', borderColor: '#0F1115' },
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
        backgroundColor: 'rgba(248, 246, 246, 0.95)',
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
        backgroundColor: '#d1fae5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    offlineText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#065f46',
        letterSpacing: 0.5,
    },
    subtext: {
        fontSize: 15,
        color: TEXT_SECONDARY,
        lineHeight: 22,
    },
    uploadContainer: {
        flex: 1,
        marginBottom: 24,
    },
    uploadBox: {
        width: '100%',
        minHeight: 220,
        borderWidth: 2,
        borderColor: '#e6d1d0',
        borderStyle: 'dashed',
        borderRadius: 16,
        backgroundColor: '#ffffff',
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
        backgroundColor: 'rgba(229, 55, 52, 0.1)',
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
        color: '#71717a',
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
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    galleryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        height: 48,
        borderRadius: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
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
        backgroundColor: '#f3f4f6',
    },
    analyzeButtonText: {
        fontSize: 17,
        fontWeight: '700',
    },
    disclaimer: {
        fontSize: 12,
        color: '#9ca3af',
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
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 72,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        shadowColor: '#000',
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
        color: '#9ca3af',
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
        backgroundColor: '#0F1115',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
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
        borderColor: '#e5e7eb',
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
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
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
        backgroundColor: '#f3e6e6',
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
        backgroundColor: 'rgba(255,255,255,0.35)',
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
        borderColor: '#e5e7eb',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
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
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 12,
    },
    addMoreButton: {
        width: 150,
        height: 150,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
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
        color: '#fff',
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
        color: '#1f2937',
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
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        marginBottom: 20,
        overflow: 'hidden',
    },
    confidenceBarFill: {
        height: '100%',
        backgroundColor: '#0F1115',
        borderRadius: 3,
    },
    section: {
        marginTop: 4,
        marginBottom: 16,
    },
    warningSection: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
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
        backgroundColor: '#0F1115',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    stepNumberText: {
        color: '#fff',
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
