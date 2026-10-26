import sharp from 'sharp';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 4096;
const COMPRESSION_QUALITY = 80;
const THUMBNAIL_SIZE = 200;
const ALLOWED_FORMATS: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export interface ImageValidationResult {
  isValid: boolean;
  mimeType?: string;
  width?: number;
  height?: number;
  size?: number;
  errors: string[];
}

export interface ProcessedImageData {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  thumbnail?: Buffer;
}

/**
 * Validate image buffer and format
 */
export async function validateImage(buffer: Buffer): Promise<ImageValidationResult> {
  const errors: string[] = [];

  // Check file size
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    errors.push(
      `Image size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`,
    );
    return { isValid: false, errors };
  }

  try {
    // Detect format and dimensions using the image decoder
    const metadata = await sharp(buffer).metadata();
    const mimeType = metadata.format ? ALLOWED_FORMATS[metadata.format] : undefined;

    if (!mimeType) {
      errors.push(
        `Unsupported file type${metadata.format ? `: ${metadata.format}` : ''}. Allowed types: ${Object.values(ALLOWED_FORMATS).join(', ')}`,
      );
      return { isValid: false, errors };
    }

    // Check dimensions
    if (metadata.width && metadata.height) {
      if (metadata.width < 100 || metadata.height < 100) {
        errors.push('Image dimensions are too small (minimum 100x100 pixels)');
      }
      if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
        errors.push(
          `Image dimensions exceed maximum allowed (${MAX_DIMENSION}x${MAX_DIMENSION} pixels)`,
        );
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      mimeType,
      width: metadata.width,
      height: metadata.height,
      size: buffer.length,
      errors: [],
    };
  } catch (error) {
    console.error('Error validating image:', error);
    errors.push('Invalid or corrupted image file');
    return { isValid: false, errors };
  }
}

/**
 * Process and optimize image
 */
export async function processImage(buffer: Buffer): Promise<ProcessedImageData> {
  try {
    // Validate first
    const validation = await validateImage(buffer);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    let imageProcessor = sharp(buffer);
    const metadata = await imageProcessor.metadata();

    // Resize if image is too large
    if (metadata.width && metadata.height) {
      if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
        imageProcessor = imageProcessor.resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }

    // Remove EXIF data for privacy
    imageProcessor = imageProcessor.rotate(); // Auto-rotate based on EXIF, then remove EXIF

    // Convert to JPEG and compress
    const processedBuffer = await imageProcessor
      .jpeg({ quality: COMPRESSION_QUALITY, mozjpeg: true })
      .toBuffer();

    // Generate thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 70 })
      .toBuffer();

    // Get final metadata
    const finalMetadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      mimeType: 'image/jpeg',
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
      size: processedBuffer.length,
      thumbnail: thumbnailBuffer,
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Convert base64 string to buffer
 */
export function base64ToBuffer(base64String: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Convert buffer to base64 string
 */
export function bufferToBase64(buffer: Buffer, mimeType: string = 'image/jpeg'): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200); // Limit length
}

export const ImageProcessingService = {
  validateImage,
  processImage,
  base64ToBuffer,
  bufferToBase64,
  sanitizeFilename,
};
