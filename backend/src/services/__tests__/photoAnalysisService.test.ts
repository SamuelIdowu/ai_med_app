import { describe, it, expect, jest } from '@jest/globals';
import {
  analyzePhoto,
  buildPhotoStoragePath,
  PhotoAnalysisDependencies,
  PhotoAnalysisRequest,
} from '../photoAnalysisService';

const makeDependencies = (
  overrides: Partial<PhotoAnalysisDependencies> = {},
): PhotoAnalysisDependencies => ({
  prepareImage: jest.fn(async () => ({
    buffer: Buffer.from('processed-image'),
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
    size: 15,
  })),
  checkMLHealth: jest.fn(async () => true),
  analyzeWound: jest.fn(async () => ({
    classification: 'laceration',
    confidence: 0.92,
    severity_grade: 'moderate' as const,
    recommendation: 'Clean the wound and apply pressure.',
    red_flags: ['Seek care if bleeding does not stop.'],
    annotations: { bounding_boxes: [] },
  })),
  analyzeGeneral: jest.fn(async () => ({
    severity: 'moderate',
    injuryType: 'Skin irritation',
    confidence: 80,
    emergencyFlag: false,
    symptoms: ['redness'],
    recommendations: ['Wash the area gently.'],
    warnings: ['Seek care if swelling worsens.'],
    rawAnalysis: 'General assessment details.',
  })),
  createEncounter: jest.fn(async () => ({ id: 'encounter-1' })),
  deleteEncounter: jest.fn(async () => undefined),
  uploadImage: jest.fn(async () => ({ storagePath: 'encounters/encounter-1/photo.jpg' })),
  deleteStoredImage: jest.fn(async () => undefined),
  insertWoundAssessment: jest.fn(async () => ({ id: 'assessment-1' })),
  ...overrides,
});

const request: PhotoAnalysisRequest = {
  image: 'data:image/jpeg;base64,dGVzdA==',
  mode: 'auto',
  fileName: 'My Wound.JPG',
  userId: 'user-1',
  accessToken: 'token-1',
};

describe('photoAnalysisService', () => {
  it('builds user-scoped storage paths for private bucket access', () => {
    expect(buildPhotoStoragePath('user-1', 'encounter-1', 'My Wound.JPG', 1234)).toBe(
      'user-1/encounter-1/1234-my_wound.jpg',
    );
  });

  it('uses the wound model for a medical image in auto mode', async () => {
    const dependencies = makeDependencies();

    const result = await analyzePhoto(request, dependencies);

    expect(result.mode).toBe('wound');
    expect(result.fallbackReason).toBeUndefined();
    expect(result.structuredAnalysis).toMatchObject({
      classification: 'laceration',
      severity: 'moderate',
      confidence: 92,
      emergencyFlag: false,
    });
    expect(result.encounterId).toBe('encounter-1');
    expect(result.storagePath).toBe('encounters/encounter-1/photo.jpg');
    expect(result.imageMetadata).toEqual({
      width: 800,
      height: 600,
      size: 15,
      mimeType: 'image/jpeg',
    });
    expect(dependencies.createEncounter).toHaveBeenCalledTimes(1);
    expect(dependencies.createEncounter).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        type: 'photo_analysis',
        category: 'Wound Scan',
        notes: expect.stringContaining('Assessment: laceration'),
      }),
      'token-1',
    );
    expect(dependencies.uploadImage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        encounterId: 'encounter-1',
        fileName: 'my_wound.jpg',
      }),
    );
    expect(dependencies.insertWoundAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'encounter-1',
        storagePath: 'encounters/encounter-1/photo.jpg',
        confidence: 0.92,
        severity: 'moderate',
      }),
    );
  });

  it('falls back to general AI when the wound model is unavailable', async () => {
    const dependencies = makeDependencies({
      checkMLHealth: jest.fn(async () => false),
    });

    const result = await analyzePhoto(request, dependencies);

    expect(result.mode).toBe('general');
    expect(result.fallbackReason).toBe('ml_unavailable');
    expect(result.structuredAnalysis.classification).toBe('Skin irritation');
    expect(dependencies.analyzeWound).not.toHaveBeenCalled();
    expect(dependencies.analyzeGeneral).toHaveBeenCalled();
    expect(dependencies.insertWoundAssessment).not.toHaveBeenCalled();
  });

  it('falls back to general AI for a non-medical image in auto mode', async () => {
    const dependencies = makeDependencies({
      analyzeWound: jest.fn(async () => ({
        classification: 'non_medical_image',
        confidence: 0.97,
        severity_grade: 'mild' as const,
      })),
      analyzeGeneral: jest.fn(async () => ({
        severity: 'none',
        injuryType: 'non_medical_image',
        confidence: 95,
        emergencyFlag: false,
        symptoms: [],
        recommendations: ['Upload a clear photo of an injury if you need first-aid guidance.'],
        warnings: [],
      })),
    });

    const result = await analyzePhoto(request, dependencies);

    expect(result.mode).toBe('general');
    expect(result.fallbackReason).toBe('non_medical');
    expect(result.structuredAnalysis.isNonMedical).toBe(true);
    expect(dependencies.insertWoundAssessment).not.toHaveBeenCalled();
  });

  it('falls back to general AI when wound confidence is too low in auto mode', async () => {
    const dependencies = makeDependencies({
      analyzeWound: jest.fn(async () => ({
        classification: 'laceration',
        confidence: 0.31,
        severity_grade: 'mild' as const,
        recommendation: 'Clean the wound.',
      })),
    });

    const result = await analyzePhoto(request, dependencies);

    expect(result.mode).toBe('general');
    expect(result.fallbackReason).toBe('low_confidence');
    expect(dependencies.analyzeGeneral).toHaveBeenCalled();
    expect(dependencies.insertWoundAssessment).not.toHaveBeenCalled();
  });

  it('falls back to general AI when the wound model errors in auto mode', async () => {
    const dependencies = makeDependencies({
      analyzeWound: jest.fn(async () => {
        throw new Error('vision inference failed');
      }),
    });

    const result = await analyzePhoto(request, dependencies);

    expect(result.mode).toBe('general');
    expect(result.fallbackReason).toBe('ml_error');
    expect(dependencies.analyzeGeneral).toHaveBeenCalled();
    expect(dependencies.insertWoundAssessment).not.toHaveBeenCalled();
  });

  it('does not fall back to Gemini when wound mode is forced and ML is down', async () => {
    const dependencies = makeDependencies({
      checkMLHealth: jest.fn(async () => false),
    });

    await expect(analyzePhoto({ ...request, mode: 'wound' }, dependencies)).rejects.toMatchObject({
      code: 'WOUND_AI_UNAVAILABLE',
      statusCode: 503,
    });

    expect(dependencies.analyzeGeneral).not.toHaveBeenCalled();
    expect(dependencies.createEncounter).not.toHaveBeenCalled();
  });

  it('bypasses the wound model in general mode', async () => {
    const dependencies = makeDependencies();

    const result = await analyzePhoto({ ...request, mode: 'general' }, dependencies);

    expect(result.mode).toBe('general');
    expect(result.fallbackReason).toBeUndefined();
    expect(dependencies.checkMLHealth).not.toHaveBeenCalled();
    expect(dependencies.analyzeWound).not.toHaveBeenCalled();
    expect(dependencies.insertWoundAssessment).not.toHaveBeenCalled();
  });

  it('passes the user profile context to general AI analysis', async () => {
    const dependencies = makeDependencies();

    await analyzePhoto(
      {
        ...request,
        mode: 'general',
        profileContext: 'USER MEDICAL PROFILE: Allergies: penicillin',
      },
      dependencies,
    );

    expect(dependencies.analyzeGeneral).toHaveBeenCalledWith(
      expect.any(String),
      'image/jpeg',
      'USER MEDICAL PROFILE: Allergies: penicillin',
    );
  });

  it('deletes the encounter when image persistence fails', async () => {
    const dependencies = makeDependencies({
      uploadImage: jest.fn(async () => {
        throw new Error('storage unavailable');
      }),
    });

    await expect(analyzePhoto(request, dependencies)).rejects.toMatchObject({
      code: 'PHOTO_PERSISTENCE_FAILED',
    });

    expect(dependencies.deleteEncounter).toHaveBeenCalledWith('encounter-1', 'user-1', 'token-1');
    expect(dependencies.deleteStoredImage).not.toHaveBeenCalled();
  });

  it('cleans up the stored image and encounter when wound assessment persistence fails', async () => {
    const dependencies = makeDependencies({
      insertWoundAssessment: jest.fn(async () => {
        throw new Error('database unavailable');
      }),
    });

    await expect(analyzePhoto(request, dependencies)).rejects.toMatchObject({
      code: 'PHOTO_PERSISTENCE_FAILED',
    });

    expect(dependencies.deleteStoredImage).toHaveBeenCalledWith('encounters/encounter-1/photo.jpg');
    expect(dependencies.deleteEncounter).toHaveBeenCalledWith('encounter-1', 'user-1', 'token-1');
  });
});
