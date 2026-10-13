import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import { AIServiceError } from '../types/errors';

export const chat = async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            res.status(400).json({
                error: 'Message is required',
                code: 'MISSING_MESSAGE',
                userMessage: 'Please enter a message to continue.'
            });
            return;
        }

        // Extract user ID and access token for function calling
        const accessToken = req.headers.authorization?.split(' ')[1];
        const userId = (req as any).user?.id; // Assuming auth middleware adds user to request

        const response = await GeminiService.chat(message, history, userId, accessToken);
        res.json({ response });
    } catch (error) {
        console.error('Chat Controller Error:', error);

        if (error instanceof AIServiceError) {
            res.status(error.statusCode).json({
                error: error.message,
                code: error.code,
                userMessage: error.userMessage
            });
        } else {
            res.status(500).json({
                error: 'An unexpected error occurred',
                code: 'UNKNOWN_ERROR',
                userMessage: 'Something went wrong. Please try again.'
            });
        }
    }
};

export const analyze = async (req: Request, res: Response) => {
    try {
        const { image } = req.body;

        if (!image) {
            res.status(400).json({
                error: 'Image data is required',
                code: 'MISSING_IMAGE',
                userMessage: 'Please upload an image to analyze.'
            });
            return;
        }

        // Import imageProcessingService
        const { ImageProcessingService } = await import('../services/imageProcessingService');

        // Convert base64 to buffer
        const imageBuffer = ImageProcessingService.base64ToBuffer(image);

        // Validate image
        const validation = await ImageProcessingService.validateImage(imageBuffer);
        if (!validation.isValid) {
            res.status(400).json({
                error: 'Invalid image',
                code: 'INVALID_IMAGE',
                userMessage: validation.errors.join(', ')
            });
            return;
        }

        // Process and optimize image
        const processedImage = await ImageProcessingService.processImage(imageBuffer);


        // Convert processed image back to base64 for Gemini
        const processedBase64 = ImageProcessingService.bufferToBase64(processedImage.buffer, processedImage.mimeType);

        // Analyze with Gemini
        const analysis = await GeminiService.analyzeImage(processedBase64, processedImage.mimeType);

        // Build clean readable text from structured or raw analysis
        const structuredAnalysis = typeof analysis === 'object' ? analysis : null;
        let readableText: string;

        if (structuredAnalysis) {
            const parts: string[] = [];
            parts.push(`Severity: ${structuredAnalysis.severity?.toUpperCase() ?? 'UNKNOWN'}`);
            parts.push(`Injury: ${structuredAnalysis.injuryType ?? 'General Assessment'}`);
            if (structuredAnalysis.confidence != null) {
                parts.push(`Confidence: ${structuredAnalysis.confidence}%`);
            }
            if (structuredAnalysis.symptoms?.length) {
                parts.push(`\nSymptoms:\n${structuredAnalysis.symptoms.map((s: string) => `• ${s}`).join('\n')}`);
            }
            if (structuredAnalysis.recommendations?.length) {
                parts.push(`\nFirst Aid Steps:\n${structuredAnalysis.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`);
            }
            if (structuredAnalysis.warnings?.length) {
                parts.push(`\nWarnings:\n${structuredAnalysis.warnings.map((w: string) => `⚠ ${w}`).join('\n')}`);
            }
            if (structuredAnalysis.emergencyFlag) {
                parts.unshift('🚨 EMERGENCY — Call 911 immediately.');
            }
            readableText = parts.join('\n');
        } else {
            readableText = typeof analysis === 'string' ? analysis : 'Analysis complete.';
        }

        // Return structured response
        res.json({
            analysis: readableText,
            structuredAnalysis,
            imageMetadata: {
                width: processedImage.width,
                height: processedImage.height,
                size: processedImage.size,
                mimeType: processedImage.mimeType
            }
        });
    } catch (error) {
        console.error('Analyze Controller Error:', error);

        if (error instanceof AIServiceError) {
            res.status(error.statusCode).json({
                error: error.message,
                code: error.code,
                userMessage: error.userMessage
            });
        } else {
            res.status(500).json({
                error: 'An unexpected error occurred',
                code: 'UNKNOWN_ERROR',
                userMessage: 'Failed to analyze image. Please try again.'
            });
        }
    }
};
