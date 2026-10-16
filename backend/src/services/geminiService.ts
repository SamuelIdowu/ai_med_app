import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { QuotaExceededError, InvalidRequestError, NetworkError, APIKeyError } from '../types/errors';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set in environment variables. AI features will not work.');
} else {
    console.log('✅ GEMINI_API_KEY is configured');
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are an AI First Aid Assistant providing emergency medical guidance.

CRITICAL RULES:
- Life-threatening situations: Always tell user to call 911/emergency services immediately
- Provide clear, numbered steps that are easy to follow
- Use calm, reassuring language appropriate for stressed situations
- Never diagnose medical conditions
- Always remind: You are NOT a replacement for professional medical care

RESPONSE FORMAT:
1. Assess severity (Minor/Serious/Critical)
2. Immediate safety actions
3. Step-by-step instructions
4. When to seek professional help

EXAMPLES OF CRITICAL SITUATIONS requiring immediate 911 call:
- Severe bleeding that won't stop after 10 minutes of pressure
- Difficulty breathing or choking
- Chest pain or suspected heart attack
- Loss of consciousness
- Severe burns (larger than palm of hand)
- Suspected poisoning or overdose
- Severe allergic reactions
- Head injuries with confusion or loss of consciousness
- Broken bones with bone visible or severe deformity

RESPONSE STYLE:
- Start responses with severity assessment
- Use simple, direct language
- Number all steps clearly
- Highlight warnings prominently
- End with when to call emergency services if not already advised`,
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ]
});

export const GeminiService = {
    async chat(message: string, history: any[] = [], userId?: string, accessToken?: string) {
        if (!API_KEY) {
            throw new APIKeyError();
        }

        // Sanitize history: Gemini requires the first turn to be a 'user' turn.
        // If the client sends history starting with 'model' (e.g. initial greeting), remove it.
        let validHistory = history;
        while (validHistory.length > 0 && validHistory[0].role === 'model') {
            validHistory = validHistory.slice(1);
        }

        try {
            // Import function declarations and handlers
            const { functionDeclarations } = await import('../tools/functionDeclarations');
            const { executeFunctionCall } = await import('../tools/functionHandlers');

            const chat = model.startChat({
                history: validHistory,
                tools: userId ? [{ functionDeclarations }] : undefined, // Only enable tools if user is authenticated
                generationConfig: {
                    maxOutputTokens: 8192,
                },
            });

            let result = await chat.sendMessage(message);
            let response = await result.response;

            // Handle function calls in a loop
            const functionCalls = response.functionCalls();
            while (functionCalls && functionCalls.length > 0) {
                const functionCall = functionCalls[0];
                console.log('[GeminiService] AI requested function:', functionCall.name);

                // Execute the function
                const functionResponse = await executeFunctionCall(
                    { name: functionCall.name, args: functionCall.args },
                    accessToken || ''
                );

                console.log('[GeminiService] Function result:', functionResponse);

                // Send function result back to AI
                result = await chat.sendMessage([{
                    functionResponse: {
                        name: functionCall.name,
                        response: functionResponse
                    }
                }]);
                response = await result.response;
            }

            const text = response.text();
            return text;
        } catch (error: any) {
            console.error('Gemini Chat Error:', error);

            // Parse error and throw appropriate custom error
            const errorMessage = error?.message || '';

            // Check for quota/rate limit errors
            if (error?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
                throw new QuotaExceededError(errorMessage);
            }

            // Check for invalid request errors
            if (error?.status === 400 || errorMessage.includes('invalid') || errorMessage.includes('First content should be')) {
                throw new InvalidRequestError(errorMessage);
            }

            // Check for network errors
            if (error?.status === 503 || error?.status === 504 || errorMessage.includes('fetch') || errorMessage.includes('network')) {
                throw new NetworkError(errorMessage);
            }

            // Default to generic error with user-friendly message
            throw new InvalidRequestError('An unexpected error occurred while processing your request.');
        }
    },

    async analyzeImage(imageBuffer: Buffer | string, mimeType: string = 'image/jpeg') {
        if (!API_KEY) {
            throw new APIKeyError();
        }

        try {
            // If string (base64), ensure clean
            let imageData = imageBuffer;
            if (typeof imageBuffer === 'string') {
                // Remove header if present "data:image/jpeg;base64,"
                imageData = imageBuffer.replace(/^data:image\/[a-z]+;base64,/, "");
            }

            const prompt = `You are a medical AI assistant analyzing an injury or medical condition from an image.

IMPORTANT: Respond with a structured analysis in this EXACT JSON format:
{
  "severity": "minor" | "moderate" | "serious" | "critical",
  "injuryType": "short description of injury type",
  "confidence": 0-100,
  "emergencyFlag": true/false,
  "symptoms": ["symptom1", "symptom2", ...],
  "recommendations": ["step1", "step2", ...],
  "warnings": ["warning1", "warning2", ...]
}

CRITICAL GUIDELINES:
- First, check if the image depicts a human wound, trauma, rash, or medical injury.
- If this is NOT a medical injury or human skin condition (e.g., logo, badge, emblem, cartoon, animal, building, document, food, household object):
  Set "injuryType" to "non_medical_image"
  Set "severity" to "none"
  Set "confidence" to 0
  Set "emergencyFlag" to false
  Set "symptoms" to ["Non-medical subject or synthetic graphic detected"]
  Set "recommendations" to ["No human skin or injury detected. Center camera on the affected skin or wound and re-scan."]
  Set "warnings" to ["Computer vision scan is reserved exclusively for clinical wound triage."]
- If severe bleeding, difficulty breathing, chest pain, loss of consciousness, or severe allergic reaction: set emergencyFlag to true and severity to "critical"
- Include clear, actionable first aid steps in recommendations
- Number all recommendations as clear steps
- Include when to seek professional care in warnings

Analyze the image now:`;

            const imagePart = {
                inlineData: {
                    data: imageData as string,
                    mimeType
                }
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            let text = response.text();

            // Try to parse structured JSON response
            try {
                // Extract JSON from markdown code blocks if present
                const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonText = jsonMatch[1] || jsonMatch[0];
                    const structuredResponse = JSON.parse(jsonText);

                    // Validate required fields
                    if (structuredResponse.severity && structuredResponse.recommendations) {
                        return structuredResponse;
                    }
                }
            } catch (parseError) {
                console.warn('Failed to parse structured response, using raw text:', parseError);
            }

            // Fallback to raw text with basic structure
            return {
                severity: 'moderate',
                injuryType: 'General Assessment',
                confidence: 70,
                emergencyFlag: text.toLowerCase().includes('911') || text.toLowerCase().includes('emergency services'),
                symptoms: [],
                recommendations: text.split('\n').filter(line => line.trim().length > 0).slice(0, 5),
                warnings: ['Always seek professional medical care if symptoms worsen'],
                rawAnalysis: text
            };
        } catch (error: any) {
            console.error('Gemini Vision Error:', error);

            const errorMessage = error?.message || '';

            if (error?.status === 429 || errorMessage.includes('quota')) {
                throw new QuotaExceededError(errorMessage);
            }

            if (error?.status === 400 || errorMessage.includes('invalid')) {
                throw new InvalidRequestError(errorMessage);
            }

            if (error?.status === 503 || error?.status === 504 || errorMessage.includes('network')) {
                throw new NetworkError(errorMessage);
            }

            throw new InvalidRequestError('Failed to analyze image.');
        }
    }
};
