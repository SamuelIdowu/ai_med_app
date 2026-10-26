import { getSupabaseAdmin } from '../db/client';
import { AIServiceError } from '../types/errors';
import { GeminiService } from './geminiService';
import {
  ImageProcessingService,
  ProcessedImageData,
  sanitizeFilename,
} from './imageProcessingService';
import { defaultMLClient, MLClient, WoundAnalysisResult } from './mlClient';
import * as encounterService from './encounterService';

export type PhotoAnalysisMode = 'auto' | 'wound' | 'general';
export type PhotoAnalysisResultMode = 'wound' | 'general';
export type PhotoAnalysisSeverity = 'mild' | 'moderate' | 'severe' | 'critical' | 'none';
export type PhotoAnalysisFallbackReason =
  'ml_unavailable' | 'ml_error' | 'non_medical' | 'low_confidence';

export interface StructuredPhotoAnalysis {
  severity: PhotoAnalysisSeverity;
  classification: string;
  confidence: number;
  emergencyFlag: boolean;
  isNonMedical: boolean;
  symptoms: string[];
  recommendations: string[];
  warnings: string[];
  rawAnalysis?: string;
}

export interface PhotoAnalysisRequest {
  image: string;
  mode?: PhotoAnalysisMode;
  fileName?: string;
  userId: string;
  accessToken?: string;
  profileContext?: string;
}

export interface PhotoAnalysisResponse {
  encounterId: string;
  mode: PhotoAnalysisResultMode;
  fallbackReason?: PhotoAnalysisFallbackReason;
  analysis: string;
  structuredAnalysis: StructuredPhotoAnalysis;
  imageMetadata: {
    width: number;
    height: number;
    size: number;
    mimeType: string;
  };
  storagePath: string;
}

export interface PhotoAnalysisDependencies {
  prepareImage: (base64Image: string) => Promise<ProcessedImageData>;
  checkMLHealth: () => Promise<boolean>;
  analyzeWound: (buffer: Buffer, fileName: string) => Promise<WoundAnalysisResult>;
  analyzeGeneral: (
    base64Image: string,
    mimeType: string,
    profileContext?: string,
  ) => Promise<unknown>;
  createEncounter: (
    userId: string,
    data: Record<string, unknown>,
    token?: string,
  ) => Promise<{ id: string }>;
  deleteEncounter: (encounterId: string, userId: string, token?: string) => Promise<unknown>;
  uploadImage: (args: {
    userId: string;
    encounterId: string;
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }) => Promise<{ storagePath: string }>;
  deleteStoredImage: (storagePath: string) => Promise<void>;
  insertWoundAssessment: (args: {
    encounterId: string;
    storagePath: string;
    classification: string;
    confidence: number;
    severity: PhotoAnalysisSeverity;
    annotations: Record<string, unknown>;
  }) => Promise<{ id: string }>;
}

const ML_CONFIDENCE_THRESHOLD = 0.5;

export const buildPhotoStoragePath = (
  userId: string,
  encounterId: string,
  fileName: string,
  timestamp: number = Date.now(),
): string => {
  const safeFileName = sanitizeFilename(fileName || `photo-${timestamp}.jpg`);
  return `${userId}/${encounterId}/${timestamp}-${safeFileName}`;
};

const prepareImage = async (base64Image: string): Promise<ProcessedImageData> => {
  try {
    const buffer = ImageProcessingService.base64ToBuffer(base64Image);
    const validation = await ImageProcessingService.validateImage(buffer);
    if (!validation.isValid) {
      throw new AIServiceError(
        'INVALID_IMAGE',
        validation.errors.join(', '),
        validation.errors.join(', '),
        400,
      );
    }
    return ImageProcessingService.processImage(buffer);
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    throw new AIServiceError(
      'INVALID_IMAGE',
      error instanceof Error ? error.message : 'Invalid image',
      'The image could not be processed. Please choose a clear JPEG or PNG photo.',
      400,
    );
  }
};

const normalizeMLSeverity = (severity: string | undefined): PhotoAnalysisSeverity => {
  if (
    severity === 'mild' ||
    severity === 'moderate' ||
    severity === 'severe' ||
    severity === 'critical'
  ) {
    return severity;
  }
  return 'none';
};

const normalizeGeneralSeverity = (severity: unknown): PhotoAnalysisSeverity => {
  if (severity === 'minor' || severity === 'mild') return 'mild';
  if (severity === 'moderate') return 'moderate';
  if (severity === 'serious' || severity === 'severe') return 'severe';
  if (severity === 'critical') return 'critical';
  return 'none';
};

const normalizeConfidence = (confidence: unknown): number => {
  const value = typeof confidence === 'number' ? confidence : Number(confidence);
  if (!Number.isFinite(value)) return 0;
  const percent = value > 1 ? value : value * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
};

const stringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const normalizeWoundAnalysis = (analysis: WoundAnalysisResult): StructuredPhotoAnalysis => {
  const severity = normalizeMLSeverity(analysis.severity_grade);
  const classification = analysis.classification || 'unknown';
  const isNonMedical =
    classification === 'non_medical_image' || classification === 'unknown' || severity === 'none';
  const recommendations = analysis.recommendation ? [analysis.recommendation] : [];

  return {
    severity,
    classification,
    confidence: normalizeConfidence(analysis.confidence),
    emergencyFlag: severity === 'severe' || severity === 'critical',
    isNonMedical,
    symptoms: [],
    recommendations,
    warnings: stringArray(analysis.red_flags),
  };
};

const normalizeGeneralAnalysis = (analysis: unknown): StructuredPhotoAnalysis => {
  if (typeof analysis === 'string') {
    const emergencyFlag =
      analysis.toLowerCase().includes('911') ||
      analysis.toLowerCase().includes('emergency services');
    return {
      severity: emergencyFlag ? 'critical' : 'moderate',
      classification: 'General Assessment',
      confidence: 70,
      emergencyFlag,
      isNonMedical: false,
      symptoms: [],
      recommendations: analysis
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5),
      warnings: ['Seek professional medical care if symptoms worsen.'],
      rawAnalysis: analysis,
    };
  }

  const value = (analysis || {}) as Record<string, unknown>;
  const severity = normalizeGeneralSeverity(value.severity);
  const classification =
    typeof value.injuryType === 'string' && value.injuryType.trim()
      ? value.injuryType
      : 'General Assessment';
  const isNonMedical = classification === 'non_medical_image' || severity === 'none';

  return {
    severity,
    classification,
    confidence: normalizeConfidence(value.confidence),
    emergencyFlag: value.emergencyFlag === true || severity === 'critical',
    isNonMedical,
    symptoms: stringArray(value.symptoms),
    recommendations: stringArray(value.recommendations),
    warnings: stringArray(value.warnings),
    rawAnalysis: typeof value.rawAnalysis === 'string' ? value.rawAnalysis : undefined,
  };
};

const toReadableAnalysis = (analysis: StructuredPhotoAnalysis): string => {
  const parts: string[] = [];
  if (analysis.emergencyFlag) {
    parts.push('EMERGENCY - Call 911 immediately.');
  }
  parts.push(`Severity: ${analysis.severity.toUpperCase()}`);
  parts.push(`Assessment: ${analysis.classification}`);
  if (analysis.confidence > 0) {
    parts.push(`Confidence: ${analysis.confidence}%`);
  }
  if (analysis.symptoms.length > 0) {
    parts.push(`\nObservations:\n${analysis.symptoms.map((item) => `- ${item}`).join('\n')}`);
  }
  if (analysis.recommendations.length > 0) {
    parts.push(
      `\nFirst Aid Steps:\n${analysis.recommendations
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n')}`,
    );
  }
  if (analysis.warnings.length > 0) {
    parts.push(`\nWarnings:\n${analysis.warnings.map((item) => `- ${item}`).join('\n')}`);
  }
  if (analysis.rawAnalysis) {
    parts.push(`\nDetails:\n${analysis.rawAnalysis}`);
  }
  return parts.join('\n');
};

const shouldFallbackFromML = (analysis: StructuredPhotoAnalysis): boolean => {
  return (
    analysis.isNonMedical ||
    analysis.classification === 'non_medical_image' ||
    analysis.confidence < ML_CONFIDENCE_THRESHOLD * 100
  );
};

const fallbackReasonForML = (analysis: StructuredPhotoAnalysis): PhotoAnalysisFallbackReason => {
  if (analysis.isNonMedical || analysis.classification === 'non_medical_image') {
    return 'non_medical';
  }
  return 'low_confidence';
};

const defaultDependencies: PhotoAnalysisDependencies = {
  prepareImage,
  checkMLHealth: () => defaultMLClient.checkHealth(),
  analyzeWound: (buffer, fileName) => defaultMLClient.analyzeWoundImage(buffer, fileName),
  analyzeGeneral: (base64Image, mimeType, profileContext) =>
    GeminiService.analyzeImage(base64Image, mimeType, profileContext),
  createEncounter: (userId, data, token) => encounterService.createEncounter(userId, data, token),
  deleteEncounter: (encounterId, userId, token) =>
    encounterService.deleteEncounter(encounterId, userId, token),
  uploadImage: async ({ userId, encounterId, buffer, mimeType, fileName }) => {
    const supabase = getSupabaseAdmin();
    const storagePath = buildPhotoStoragePath(userId, encounterId, fileName);
    const { error } = await supabase.storage.from('medical-images').upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) {
      throw new AIServiceError(
        'IMAGE_STORAGE_FAILED',
        error.message,
        'The photo could not be stored securely. Please try again.',
        500,
      );
    }
    return { storagePath };
  },
  deleteStoredImage: async (storagePath) => {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from('medical-images').remove([storagePath]);
    if (error) {
      console.error('Failed to clean up stored photo:', error);
    }
  },
  insertWoundAssessment: async ({
    encounterId,
    storagePath,
    classification,
    confidence,
    severity,
    annotations,
  }) => {
    const supabase = getSupabaseAdmin();
    const dbSeverity =
      severity === 'mild' || severity === 'moderate' || severity === 'severe'
        ? severity
        : severity === 'critical'
          ? 'severe'
          : null;
    const { data, error } = await supabase
      .from('wound_assessments')
      .insert({
        encounter_id: encounterId,
        storage_path: storagePath,
        classification,
        confidence: Math.max(0, Math.min(1, confidence)),
        severity_grade: dbSeverity,
        annotations,
      })
      .select()
      .single();
    if (error) {
      throw new AIServiceError(
        'WOUND_ASSESSMENT_FAILED',
        error.message,
        'The wound assessment could not be saved. Please try again.',
        500,
      );
    }
    return data;
  },
};

export const analyzePhoto = async (
  request: PhotoAnalysisRequest,
  dependencies: PhotoAnalysisDependencies = defaultDependencies,
): Promise<PhotoAnalysisResponse> => {
  const mode: PhotoAnalysisMode = request.mode || 'auto';
  const processedImage = await dependencies.prepareImage(request.image);
  const base64Image = ImageProcessingService.bufferToBase64(
    processedImage.buffer,
    processedImage.mimeType,
  );
  const fileName = sanitizeFilename(request.fileName || `photo-${Date.now()}.jpg`);

  let resultMode: PhotoAnalysisResultMode = 'general';
  let fallbackReason: PhotoAnalysisFallbackReason | undefined;
  let structuredAnalysis: StructuredPhotoAnalysis;
  let rawWoundAnalysis: WoundAnalysisResult | undefined;

  if (mode === 'general') {
    const generalAnalysis = await dependencies.analyzeGeneral(
      base64Image,
      processedImage.mimeType,
      request.profileContext,
    );
    structuredAnalysis = normalizeGeneralAnalysis(generalAnalysis);
  } else {
    const mlAvailable = await dependencies.checkMLHealth().catch(() => false);

    if (!mlAvailable) {
      if (mode === 'wound') {
        throw new AIServiceError(
          'WOUND_AI_UNAVAILABLE',
          'Wound vision service is unavailable',
          'Wound analysis is temporarily unavailable. Try General AI or retry shortly.',
          503,
        );
      }
      fallbackReason = 'ml_unavailable';
      const generalAnalysis = await dependencies.analyzeGeneral(
        base64Image,
        processedImage.mimeType,
      );
      structuredAnalysis = normalizeGeneralAnalysis(generalAnalysis);
    } else {
      try {
        rawWoundAnalysis = await dependencies.analyzeWound(processedImage.buffer, fileName);
        const woundAnalysis = normalizeWoundAnalysis(rawWoundAnalysis);
        if (mode === 'auto' && shouldFallbackFromML(woundAnalysis)) {
          fallbackReason = fallbackReasonForML(woundAnalysis);
          const generalAnalysis = await dependencies.analyzeGeneral(
            base64Image,
            processedImage.mimeType,
          );
          structuredAnalysis = normalizeGeneralAnalysis(generalAnalysis);
        } else {
          resultMode = 'wound';
          structuredAnalysis = woundAnalysis;
        }
      } catch (error) {
        if (mode === 'wound') {
          throw new AIServiceError(
            'WOUND_AI_FAILED',
            error instanceof Error ? error.message : 'Wound analysis failed',
            'Wound analysis failed. Try General AI or retake the photo.',
            503,
          );
        }
        fallbackReason = 'ml_error';
        const generalAnalysis = await dependencies.analyzeGeneral(
          base64Image,
          processedImage.mimeType,
        );
        structuredAnalysis = normalizeGeneralAnalysis(generalAnalysis);
      }
    }
  }

  const readableAnalysis = toReadableAnalysis(structuredAnalysis);
  const category = resultMode === 'wound' ? 'Wound Scan' : 'Photo Analysis';
  const encounter = await dependencies.createEncounter(
    request.userId,
    {
      type: 'photo_analysis',
      category,
      notes: readableAnalysis,
      status: 'active',
      symptoms: structuredAnalysis.symptoms,
    },
    request.accessToken,
  );

  if (!encounter?.id) {
    throw new AIServiceError(
      'ENCOUNTER_CREATE_FAILED',
      'Encounter creation returned no ID',
      'Your analysis could not be saved. Please try again.',
      500,
    );
  }

  let storagePath = '';
  try {
    const upload = await dependencies.uploadImage({
      userId: request.userId,
      encounterId: encounter.id,
      buffer: processedImage.buffer,
      mimeType: processedImage.mimeType,
      fileName,
    });
    storagePath = upload.storagePath;

    if (resultMode === 'wound' && rawWoundAnalysis) {
      await dependencies.insertWoundAssessment({
        encounterId: encounter.id,
        storagePath,
        classification: structuredAnalysis.classification,
        confidence: normalizeConfidence(rawWoundAnalysis.confidence) / 100,
        severity: structuredAnalysis.severity,
        annotations: (rawWoundAnalysis.annotations || {}) as Record<string, unknown>,
      });
    }
  } catch (error) {
    if (storagePath) {
      await dependencies.deleteStoredImage(storagePath).catch(() => undefined);
    }
    await dependencies
      .deleteEncounter(encounter.id, request.userId, request.accessToken)
      .catch(() => undefined);
    if (error instanceof AIServiceError) throw error;
    throw new AIServiceError(
      'PHOTO_PERSISTENCE_FAILED',
      error instanceof Error ? error.message : 'Photo persistence failed',
      'Your analysis could not be saved. Please try again.',
      500,
    );
  }

  return {
    encounterId: encounter.id,
    mode: resultMode,
    fallbackReason,
    analysis: readableAnalysis,
    structuredAnalysis,
    imageMetadata: {
      width: processedImage.width,
      height: processedImage.height,
      size: processedImage.size,
      mimeType: processedImage.mimeType,
    },
    storagePath,
  };
};

export const photoAnalysisModes: PhotoAnalysisMode[] = ['auto', 'wound', 'general'];
