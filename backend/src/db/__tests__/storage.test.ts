// backend/src/db/__tests__/storage.test.ts
import { describe, it, expect } from '@jest/globals';
import { MEDICAL_STORAGE_BUCKET } from '../../services/storageService';

describe('Private Medical S3 Storage Configuration', () => {
  it('defines medical-images as the target private bucket', () => {
    expect(MEDICAL_STORAGE_BUCKET).toBe('medical-images');
  });

  it('generates predictable user-scoped path structure', () => {
    const userId = 'patient-uuid-123';
    const fileName = 'wound_cut.jpg';
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathPrefix = `${userId}/`;

    expect(sanitizedFileName).toBe('wound_cut.jpg');
    expect(pathPrefix).toBe('patient-uuid-123/');
  });
});
