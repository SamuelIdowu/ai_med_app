import {
  validateImageQuality,
  compressImage,
  resizeImage,
  imageToBase64,
  processImage,
  generateThumbnail,
} from '../imageService';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

describe('Mobile Image Service & Clinical Capture Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateImageQuality', () => {
    it('returns poor quality result when image file does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: false,
      });

      const result = await validateImageQuality('file:///nonexistent.jpg');
      expect(result.isValid).toBe(false);
      expect(result.quality).toBe('poor');
      expect(result.warnings).toContain('Image file does not exist');
    });

    it('rejects oversized images exceeding 10MB limit', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: true,
        size: 15 * 1024 * 1024, // 15MB
      });

      const result = await validateImageQuality('file:///huge_photo.jpg');
      expect(result.isValid).toBe(false);
      expect(result.quality).toBe('poor');
      expect(result.warnings.some((w) => w.includes('too large'))).toBe(true);
    });

    it('flags low quality warning for suspiciously tiny images (<50KB)', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: true,
        size: 20 * 1024, // 20KB
      });

      const result = await validateImageQuality('file:///tiny_avatar.jpg');
      expect(result.warnings).toContain('Image quality may be too low for accurate analysis');
      expect(result.score).toBeLessThanOrEqual(70);
    });

    it('rates standard clinical photos with good/excellent scores', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: true,
        size: 800 * 1024, // 800KB
      });

      const result = await validateImageQuality('file:///wound_clear.jpg');
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.quality).toBe('excellent');
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('compressImage & resizeImage', () => {
    it('skips compression if image is already below 2MB target', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: true,
        size: 500 * 1024, // 500KB
      });

      const uri = 'file:///already_small.jpg';
      const result = await compressImage(uri);
      expect(result).toBe(uri);
      expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
    });

    it('compresses image when size exceeds target max size', async () => {
      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({
          exists: true,
          size: 4 * 1024 * 1024, // 4MB
        })
        .mockResolvedValueOnce({
          exists: true,
          size: 1.2 * 1024 * 1024, // 1.2MB compressed
        });

      const uri = 'file:///large_wound.jpg';
      const result = await compressImage(uri);
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        uri,
        [],
        expect.objectContaining({ format: 'jpeg' })
      );
      expect(result).toContain('_processed.jpg');
    });

    it('resizes image to target dimensions', async () => {
      const uri = 'file:///wound_hires.jpg';
      const result = await resizeImage(uri, 1280, 720);
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        uri,
        [{ resize: { width: 1280, height: 720 } }],
        expect.anything()
      );
      expect(result).toContain('_processed.jpg');
    });
  });

  describe('processImage & generateThumbnail', () => {
    it('runs end-to-end validation, compression, and base64 conversion', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 750 * 1024,
      });

      const processed = await processImage('file:///patient_wound.jpg');
      expect(processed).toBeDefined();
      expect(processed.mimeType).toBe('image/jpeg');
      expect(processed.base64).toBe('mock_file_content');
      expect(processed.quality.isValid).toBe(true);
    });

    it('generates a square thumbnail for clinical encounter previews', async () => {
      const uri = 'file:///wound_full.jpg';
      const thumb = await generateThumbnail(uri, 150);
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        uri,
        [{ resize: { width: 150, height: 150 } }],
        expect.anything()
      );
      expect(thumb).toContain('_processed.jpg');
    });
  });
});
