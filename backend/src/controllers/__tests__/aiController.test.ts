import { Request, Response } from 'express';
import { triageVitals } from '../aiController';
import { defaultMLClient } from '../../services/mlClient';

jest.mock('../../services/mlClient', () => ({
  defaultMLClient: {
    evaluateVitalsTriage: jest.fn(),
  },
}));

describe('AIController - triageVitals', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
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
    jest.clearAllMocks();
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

  it('handles downstream service error with 500 status and safety warning', async () => {
    const error = new Error('Connection refused to Python ML microservice');
    (defaultMLClient.evaluateVitalsTriage as jest.Mock).mockRejectedValueOnce(error);

    await triageVitals(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'ML_VITALS_EVAL_ERROR',
        userMessage: expect.stringContaining('emergency care'),
      })
    );
  });
});
