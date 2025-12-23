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

        // image is expected to be base64 string
        const analysis = await GeminiService.analyzeImage(image);
        res.json({ analysis });
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
