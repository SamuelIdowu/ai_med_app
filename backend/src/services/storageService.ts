// backend/src/services/storageService.ts
// Private S3 Storage Management for Medical Wound Photos & Diagnostics

import { getSupabaseAdmin } from '../db/client';

export const MEDICAL_STORAGE_BUCKET = 'medical-images';

export interface SignedUploadResponse {
  signedUrl: string;
  token: string;
  path: string;
  filePath: string;
}

/**
 * Generates a pre-signed upload URL for a patient to upload wound photos directly to private S3 bucket.
 * Bucket path structure: `${userId}/${timestamp}_${fileName}`
 */
export const getUploadUrl = async (
  userId: string,
  fileName: string,
  expiresInSeconds: number = 3600
): Promise<SignedUploadResponse> => {
  const supabase = getSupabaseAdmin();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${Date.now()}_${sanitizedFileName}`;

  const { data, error } = await supabase.storage
    .from(MEDICAL_STORAGE_BUCKET)
    .createSignedUploadUrl(filePath);

  if (error) {
    console.error('Error generating signed upload URL:', error);
    throw error;
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    filePath,
  };
};

/**
 * Generates a time-limited signed URL to securely read a private medical image.
 * Expiration defaults to 1 hour (3600s) to comply with HIPAA/medical data privacy.
 */
export const getSignedDownloadUrl = async (
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<string> => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from(MEDICAL_STORAGE_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    console.error('Error creating signed download URL:', error);
    throw error;
  }

  return data.signedUrl;
};

/**
 * Legacy compatibility alias
 */
export const getDownloadUrl = async (filePath: string): Promise<string> => {
  return getSignedDownloadUrl(filePath, 3600);
};

/**
 * Deletes a medical image from private storage
 */
export const deleteMedicalImage = async (filePath: string): Promise<void> => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(MEDICAL_STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Error deleting medical image:', error);
    throw error;
  }
};
