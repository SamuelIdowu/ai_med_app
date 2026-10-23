export type PhotoAnalysisMode = 'auto' | 'wound' | 'general';
export type PhotoAnalysisResultMode = 'wound' | 'general';
export type PhotoAnalysisSeverity =
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'critical'
  | 'none';
export type PhotoAnalysisFallbackReason =
  | 'ml_unavailable'
  | 'ml_error'
  | 'non_medical'
  | 'low_confidence';

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

export interface PhotoAnalysisResult {
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
  storagePath?: string;
}
