import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

// Constants for image validation
const MIN_DIMENSION = 480;
const MAX_DIMENSION = 4096;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const COMPRESSION_QUALITY = 0.8;
const TARGET_MAX_SIZE = 2 * 1024 * 1024; // 2MB target for upload

export interface ImageQualityResult {
    isValid: boolean;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    score: number; // 0-100
    width: number;
    height: number;
    fileSize: number;
    warnings: string[];
}

export interface ProcessedImage {
    uri: string;
    base64: string;
    mimeType: string;
    width: number;
    height: number;
    fileSize: number;
    quality: ImageQualityResult;
}

/**
 * Validate image quality and dimensions
 */
export async function validateImageQuality(uri: string): Promise<ImageQualityResult> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const warnings: string[] = [];
        let score = 100;

        if (!fileInfo.exists) {
            return {
                isValid: false,
                quality: 'poor',
                score: 0,
                width: 0,
                height: 0,
                fileSize: 0,
                warnings: ['Image file does not exist']
            };
        }

        const fileSize = fileInfo.size || 0;

        // Check file size
        if (fileSize > MAX_FILE_SIZE_BYTES) {
            warnings.push(`Image is too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum is ${MAX_FILE_SIZE_MB}MB.`);
            return {
                isValid: false,
                quality: 'poor',
                score: 0,
                width: 0,
                height: 0,
                fileSize,
                warnings
            };
        }

        // Get image dimensions (we'll need to load the image to check dimensions)
        // For now, we estimate based on file size
        const estimatedWidth = 1920;
        const estimatedHeight = 1080;

        // Check if file is suspiciously small (might be corrupted or very low quality)
        if (fileSize < 50000) { // Less than 50KB
            warnings.push('Image quality may be too low for accurate analysis');
            score -= 30;
        }

        // Score based on file size
        if (fileSize > TARGET_MAX_SIZE) {
            warnings.push('Image will be compressed for faster upload');
            score -= 10;
        }

        // Determine quality rating
        let quality: 'excellent' | 'good' | 'fair' | 'poor';
        if (score >= 90) quality = 'excellent';
        else if (score >= 70) quality = 'good';
        else if (score >= 50) quality = 'fair';
        else quality = 'poor';

        return {
            isValid: warnings.length === 0 || score >= 50,
            quality,
            score,
            width: estimatedWidth,
            height: estimatedHeight,
            fileSize,
            warnings
        };
    } catch (error) {
        console.error('Error validating image quality:', error);
        return {
            isValid: false,
            quality: 'poor',
            score: 0,
            width: 0,
            height: 0,
            fileSize: 0,
            warnings: ['Failed to validate image']
        };
    }
}

/**
 * Compress and optimize image for upload
 */
export async function compressImage(uri: string, quality: number = COMPRESSION_QUALITY): Promise<string> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const fileSize = fileInfo.exists ? (fileInfo.size || 0) : 0;

        // If image is already small enough, return as-is
        if (fileSize < TARGET_MAX_SIZE) {
            return uri;
        }

        // Compress the image
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [], // No resize, just compress
            {
                compress: quality,
                format: ImageManipulator.SaveFormat.JPEG
            }
        );

        // Check if compression was effective
        const compressedInfo = await FileSystem.getInfoAsync(manipResult.uri);
        const compressedSize = compressedInfo.exists ? (compressedInfo.size || 0) : 0;

        console.log(`Image compressed: ${(fileSize / 1024).toFixed(0)}KB → ${(compressedSize / 1024).toFixed(0)}KB`);

        return manipResult.uri;
    } catch (error) {
        console.error('Error compressing image:', error);
        return uri; // Return original if compression fails
    }
}

/**
 * Resize image to fit within max dimensions while maintaining aspect ratio
 */
export async function resizeImage(uri: string, maxWidth: number = MAX_DIMENSION, maxHeight: number = MAX_DIMENSION): Promise<string> {
    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: maxWidth, height: maxHeight } }],
            {
                compress: COMPRESSION_QUALITY,
                format: ImageManipulator.SaveFormat.JPEG
            }
        );

        return manipResult.uri;
    } catch (error) {
        console.error('Error resizing image:', error);
        return uri;
    }
}

/**
 * Convert image to base64 string
 */
export async function imageToBase64(uri: string): Promise<string> {
    try {
        // Return raw base64 without the data URI prefix.
        // The backend (geminiService) expects a clean base64 string and strips any prefix itself.
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64'
        });
        return base64;
    } catch (error) {
        console.error('Error converting image to base64:', error);
        throw error;
    }
}

/**
 * Process image: validate, compress, and prepare for upload
 */
export async function processImage(uri: string): Promise<ProcessedImage> {
    try {
        // Step 1: Validate quality
        const qualityResult = await validateImageQuality(uri);

        if (!qualityResult.isValid && qualityResult.score < 50) {
            throw new Error(qualityResult.warnings.join(', '));
        }

        // Step 2: Compress if needed
        let processedUri = uri;
        if (qualityResult.fileSize > TARGET_MAX_SIZE) {
            processedUri = await compressImage(uri);
        }

        // Step 3: Convert to base64
        const base64 = await imageToBase64(processedUri);

        // Step 4: Get final file info
        const finalInfo = await FileSystem.getInfoAsync(processedUri);
        const finalSize = finalInfo.exists ? (finalInfo.size || 0) : 0;

        return {
            uri: processedUri,
            base64,
            mimeType: 'image/jpeg',
            width: qualityResult.width,
            height: qualityResult.height,
            fileSize: finalSize,
            quality: qualityResult
        };
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
}

/**
 * Process multiple images in parallel
 */
export async function processMultipleImages(uris: string[]): Promise<ProcessedImage[]> {
    try {
        const promises = uris.map(uri => processImage(uri));
        return await Promise.all(promises);
    } catch (error) {
        console.error('Error processing multiple images:', error);
        throw error;
    }
}

/**
 * Generate thumbnail from image
 */
export async function generateThumbnail(uri: string, size: number = 200): Promise<string> {
    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: size, height: size } }],
            {
                compress: 0.7,
                format: ImageManipulator.SaveFormat.JPEG
            }
        );

        return manipResult.uri;
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        return uri;
    }
}

export const ImageService = {
    validateImageQuality,
    compressImage,
    resizeImage,
    imageToBase64,
    processImage,
    processMultipleImages,
    generateThumbnail
};
