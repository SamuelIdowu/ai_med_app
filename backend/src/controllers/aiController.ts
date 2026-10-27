import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import { defaultMLClient } from '../services/mlClient';
import {
  analyzePhoto,
  photoAnalysisModes,
  PhotoAnalysisMode,
} from '../services/photoAnalysisService';
import { AIServiceError } from '../types/errors';
import {
  getMedicalProfileContext,
  sanitizeClientProfileContext,
} from '../services/aiContextService';

export const chat = async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      res.status(400).json({
        error: 'Message is required',
        code: 'MISSING_MESSAGE',
        userMessage: 'Please enter a message to continue.',
      });
      return;
    }

    // Extract user ID and access token for function calling
    const accessToken = req.headers.authorization?.split(' ')[1];
    const userId = (req as any).user?.id; // Assuming auth middleware adds user to request

    const medicalContext = await getMedicalProfileContext(userId, accessToken);
    const profileContext = userId
      ? medicalContext.prompt
      : sanitizeClientProfileContext(req.body.profileContext);

    const response = await GeminiService.chat(
      message,
      history,
      userId,
      accessToken,
      profileContext,
    );
    res.json({ response });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Chat Controller Error');
    }

    if (error instanceof AIServiceError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
        userMessage: error.userMessage,
      });
    } else {
      res.status(500).json({
        error: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        userMessage: 'Something went wrong. Please try again.',
      });
    }
  }
};

export const analyze = async (req: Request, res: Response) => {
  try {
    const { image, mode = 'auto', fileName } = req.body;

    if (!image) {
      res.status(400).json({
        error: 'Image data is required',
        code: 'MISSING_IMAGE',
        userMessage: 'Please upload an image to analyze.',
      });
      return;
    }

    if (!photoAnalysisModes.includes(mode as PhotoAnalysisMode)) {
      res.status(400).json({
        error: 'Invalid analysis mode',
        code: 'INVALID_ANALYSIS_MODE',
        userMessage: 'Choose Auto, Wound CV, or General AI analysis.',
      });
      return;
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        error: 'User must be authenticated',
        code: 'UNAUTHENTICATED',
        userMessage: 'Please sign in to analyze a photo.',
      });
      return;
    }

    const accessToken = req.headers.authorization?.split(' ')[1];
    const medicalContext = await getMedicalProfileContext(userId, accessToken);
    const result = await analyzePhoto({
      image,
      mode: mode as PhotoAnalysisMode,
      fileName,
      userId,
      accessToken,
      profileContext: medicalContext.prompt || undefined,
    });

    res.json(result);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Analyze Controller Error');
    }

    if (error instanceof AIServiceError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
        userMessage: error.userMessage,
      });
    } else {
      res.status(500).json({
        error: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        userMessage: 'Failed to analyze image. Please try again.',
      });
    }
  }
};

export const triageVitals = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const accessToken = req.headers?.authorization?.split(' ')[1];
    const vitals = userId ? { ...req.body } : req.body;

    if (userId) {
      const medicalContext = await getMedicalProfileContext(userId, accessToken);
      if (medicalContext.age !== null && (vitals.age === undefined || vitals.age === null)) {
        vitals.age = medicalContext.age;
      }
    }

    const result = await defaultMLClient.evaluateVitalsTriage(vitals);
    res.json(result);
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Triage Vitals Controller Error');
    }
    res.status(error.response?.status || 500).json({
      error: 'Failed to evaluate vitals triage',
      code: 'ML_VITALS_EVAL_ERROR',
      userMessage:
        'Unable to evaluate vitals at this moment. If in doubt, seek immediate emergency care.',
    });
  }
};
