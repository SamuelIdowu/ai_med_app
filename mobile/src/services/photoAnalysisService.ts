import { api } from './api';
import { ImageService } from './imageService';
import { PhotoAnalysisMode, PhotoAnalysisResult } from '../types/photoAnalysis';

const fileNameFromUri = (uri: string): string => {
  const lastSegment = uri.split('/').pop() || `photo-${Date.now()}.jpg`;
  return lastSegment.split('?')[0] || `photo-${Date.now()}.jpg`;
};

export const analyzePhoto = async (
  uri: string,
  mode: PhotoAnalysisMode = 'auto'
): Promise<PhotoAnalysisResult> => {
  const processed = await ImageService.processImage(uri);
  const response = await api.post<PhotoAnalysisResult>('/ai/analyze', {
    image: `data:${processed.mimeType};base64,${processed.base64}`,
    mode,
    fileName: fileNameFromUri(uri),
  });

  return response.data;
};

export const photoAnalysisService = {
  analyze: analyzePhoto,
};
