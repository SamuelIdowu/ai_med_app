import { Request, Response } from 'express';
import { analyze, chat, triageVitals } from '../aiController';
import { defaultMLClient } from '../../services/mlClient';
import { GeminiService } from '../../services/geminiService';
import { getMedicalProfileContext } from '../../services/aiContextService';
import * as photoAnalysisService from '../../services/photoAnalysisService';

jest.mock('../../services/mlClient', () => ({
  defaultMLClient: {
    evaluateVitalsTriage: jest.fn(),
  },
}));

jest.mock('../../services/geminiService', () => ({
  GeminiService: {
    chat: jest.fn(),
  },
}));

jest.mock('../../services/aiContextService', () => ({
  getMedicalProfileContext: jest.fn(),
  sanitizeClientProfileContext: jest.fn((value: unknown) =>
    typeof value === 'string' ? `GUEST: ${value}` : '',
  ),
}));

jest.mock('../../services/photoAnalysisService', () => ({
  analyzePhoto: jest.fn(),
  photoAnalysisModes: ['auto', 'wound', 'general'],
}));

const mockedPhotoAnalysisService = photoAnalysisService as jest.Mocked<typeof photoAnalysisService>;
const mockedGetMedicalProfileContext = getMedicalProfileContext as jest.MockedFunction<
  typeof getMedicalProfileContext
>;
const mockedGeminiChat = GeminiService.chat as jest.MockedFunction<typeof GeminiService.chat>;

const emptyProfileContext = {
  hasProfile: false,
  summary: null,
  prompt: '',
  display: '',
  age: null,
};

describe('AIController - chat', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMedicalProfileContext.mockResolvedValue(emptyProfileContext);
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      body: {
        message: 'I cut my hand',
        history: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      },
      headers: { authorization: 'Bearer access-token' },
      user: { id: 'user-1' },
    } as any;
    res = {
      json: jsonMock,
      status: statusMock,
    };
  });

  it('injects the authenticated user profile into the Gemini system prompt', async () => {
    mockedGetMedicalProfileContext.mockResolvedValueOnce({
      hasProfile: true,
      summary: {} as any,
      prompt: 'USER MEDICAL PROFILE: Allergies: penicillin',
      display: 'Using medical profile: Allergies: penicillin',
      age: 34,
    });
    mockedGeminiChat.mockResolvedValueOnce('Apply pressure.');

    await chat(req as Request, res as Response);

    expect(mockedGetMedicalProfileContext).toHaveBeenCalledWith('user-1', 'access-token');
    expect(mockedGeminiChat).toHaveBeenCalledWith(
      'I cut my hand',
      req.body.history,
      'user-1',
      'access-token',
      'USER MEDICAL PROFILE: Allergies: penicillin',
    );
    expect(jsonMock).toHaveBeenCalledWith({ response: 'Apply pressure.' });
  });

  it('accepts sanitized local profile context for guests', async () => {
    req.user = undefined;
    req.body.profileContext = 'Allergies: latex';
    mockedGeminiChat.mockResolvedValueOnce('Avoid latex.');

    await chat(req as Request, res as Response);

    expect(mockedGeminiChat).toHaveBeenCalledWith(
      'I cut my hand',
      req.body.history,
      undefined,
      'access-token',
      'GUEST: Allergies: latex',
    );
  });

  it('rejects empty messages', async () => {
    req.body.message = '';

    await chat(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(mockedGeminiChat).not.toHaveBeenCalled();
  });
});

describe('AIController - analyze', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMedicalProfileContext.mockResolvedValue(emptyProfileContext);
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      body: {
        image: 'data:image/jpeg;base64,dGVzdA==',
        mode: 'auto',
        fileName: 'wound.jpg',
      },
      headers: { authorization: 'Bearer access-token' },
      user: { id: 'user-1' },
    } as any;
    res = {
      json: jsonMock,
      status: statusMock,
    };
  });

  it('delegates photo analysis with the authenticated user, token, and profile context', async () => {
    const result = {
      encounterId: 'encounter-1',
      mode: 'wound',
      analysis: 'Assessment',
      structuredAnalysis: {},
      imageMetadata: {},
    };
    mockedGetMedicalProfileContext.mockResolvedValueOnce({
      hasProfile: true,
      summary: {} as any,
      prompt: 'USER MEDICAL PROFILE: Allergies: penicillin',
      display: 'Using medical profile: Allergies: penicillin',
      age: 34,
    });
    mockedPhotoAnalysisService.analyzePhoto.mockResolvedValueOnce(result as any);

    await analyze(req as Request, res as Response);

    expect(mockedGetMedicalProfileContext).toHaveBeenCalledWith('user-1', 'access-token');
    expect(mockedPhotoAnalysisService.analyzePhoto).toHaveBeenCalledWith({
      image: req.body.image,
      mode: 'auto',
      fileName: 'wound.jpg',
      userId: 'user-1',
      accessToken: 'access-token',
      profileContext: 'USER MEDICAL PROFILE: Allergies: penicillin',
    });
    expect(jsonMock).toHaveBeenCalledWith(result);
  });

  it('rejects an invalid analysis mode before calling the service', async () => {
    req.body.mode = 'xray';

    await analyze(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(mockedPhotoAnalysisService.analyzePhoto).not.toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_ANALYSIS_MODE' }),
    );
  });

  it('rejects requests without an image', async () => {
    req.body.image = undefined;

    await analyze(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(mockedPhotoAnalysisService.analyzePhoto).not.toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ code: 'MISSING_IMAGE' }));
  });
});

describe('AIController - triageVitals', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMedicalProfileContext.mockResolvedValue(emptyProfileContext);
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      body: {
        heart_rate: 110,
        systolic_bp: 120,
        respiratory_rate: 22,
        oxygen_saturation: 97,
        body_temperature: 37.2,
      },
    };
    res = {
      json: jsonMock,
      status: statusMock,
    };
  });

  it('successfully returns evaluation result from ML service', async () => {
    const mockResult = {
      triage_level: 1,
      triage_label: 'Urgent',
      confidence: 0.94,
      probabilities: { 'Non-Urgent': 0.04, Urgent: 0.94, Emergency: 0.02 },
      risk_drivers: ['Mild Tachycardia (HR: 110 bpm)'],
      is_emergency: false,
      is_urgent: true,
      latency_ms: 2.1,
    };

    (defaultMLClient.evaluateVitalsTriage as jest.Mock).mockResolvedValueOnce(mockResult);

    await triageVitals(req as Request, res as Response);

    expect(defaultMLClient.evaluateVitalsTriage).toHaveBeenCalledWith(req.body);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('fills the age from the authenticated medical profile when omitted', async () => {
    req.user = { id: 'user-1' } as any;
    req.headers = { authorization: 'Bearer access-token' };
    mockedGetMedicalProfileContext.mockResolvedValueOnce({
      hasProfile: true,
      summary: {} as any,
      prompt: 'USER MEDICAL PROFILE: Age: 67',
      display: 'Using medical profile: Age 67',
      age: 67,
    });
    (defaultMLClient.evaluateVitalsTriage as jest.Mock).mockResolvedValueOnce({});

    await triageVitals(req as Request, res as Response);

    expect(mockedGetMedicalProfileContext).toHaveBeenCalledWith('user-1', 'access-token');
    expect(defaultMLClient.evaluateVitalsTriage).toHaveBeenCalledWith({
      ...req.body,
      age: 67,
    });
  });

  it('keeps an explicitly supplied vitals age', async () => {
    req.user = { id: 'user-1' } as any;
    req.body.age = 52;
    mockedGetMedicalProfileContext.mockResolvedValueOnce({
      hasProfile: true,
      summary: {} as any,
      prompt: 'USER MEDICAL PROFILE: Age: 67',
      display: 'Using medical profile: Age 67',
      age: 67,
    });
    (defaultMLClient.evaluateVitalsTriage as jest.Mock).mockResolvedValueOnce({});

    await triageVitals(req as Request, res as Response);

    expect(defaultMLClient.evaluateVitalsTriage).toHaveBeenCalledWith({
      ...req.body,
      age: 52,
    });
  });

  it('handles downstream service error with 500 status and safety warning', async () => {
    const error = new Error('Connection refused to Python ML microservice');
    (defaultMLClient.evaluateVitalsTriage as jest.Mock).mockRejectedValueOnce(error);

    await triageVitals(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'ML_VITALS_EVAL_ERROR',
        userMessage: expect.stringContaining('emergency care'),
      }),
    );
  });
});
