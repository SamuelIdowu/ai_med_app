import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import * as encounterController from '../encounterController';
import * as encounterService from '../../services/encounterService';

jest.mock('../../services/encounterService');
const mockedEncounterService = encounterService as jest.Mocked<typeof encounterService>;

const ENCOUNTER_ID = '3f2e5bb7-6c59-4a16-9a8e-1d13a2e0b421';
const MISSING_ENCOUNTER_ID = '8a1f4d20-9c73-4b02-a5d1-77c0e3f9a812';

describe('Encounter Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    sendMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock });

    mockRes = {
      status: statusMock as any,
      json: jsonMock as any,
      send: sendMock as any,
    };
  });

  it('creates encounter with valid payload and authenticated user', async () => {
    mockReq = {
      user: { id: 'user-123' },
      headers: { authorization: 'Bearer token-xyz' },
      body: {
        title: 'Bee Sting Triage',
        severity: 'high',
        status: 'in_progress',
        symptoms: ['swelling', 'difficulty breathing'],
      },
    };

    const mockCreated = {
      id: '3f2e5bb7-6c59-4a16-9a8e-1d13a2e0b421',
      user_id: 'user-123',
      title: 'Bee Sting Triage',
      severity: 'high',
      status: 'in_progress',
      symptoms: ['swelling', 'difficulty breathing'],
    };

    mockedEncounterService.createEncounter.mockResolvedValueOnce(mockCreated as any);

    await encounterController.create(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(mockCreated);
    expect(mockedEncounterService.createEncounter).toHaveBeenCalledWith(
      'user-123',
      mockReq.body,
      'token-xyz',
    );
  });

  it('rejects creation when required fields or auth are missing', async () => {
    mockReq = {
      user: undefined,
      headers: {},
      body: {},
    };

    await encounterController.create(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('fetches single encounter by ID', async () => {
    mockReq = {
      user: { id: 'user-123' },
      headers: { authorization: 'Bearer token-xyz' },
      params: { id: '3f2e5bb7-6c59-4a16-9a8e-1d13a2e0b421' },
    };

    const mockEncounter = { id: '3f2e5bb7-6c59-4a16-9a8e-1d13a2e0b421', user_id: 'user-123', title: 'Chest Pain' };
    mockedEncounterService.getEncounter.mockResolvedValueOnce(mockEncounter as any);

    await encounterController.getById(mockReq as Request, mockRes as Response);

    expect(jsonMock).toHaveBeenCalledWith(mockEncounter);
  });

  it('returns 404 when encounter is not found', async () => {
    mockReq = {
      user: { id: 'user-123' },
      headers: { authorization: 'Bearer token-xyz' },
      params: { id: '8a1f4d20-9c73-4b02-a5d1-77c0e3f9a812' },
    };

    mockedEncounterService.getEncounter.mockResolvedValueOnce(null as any);

    await encounterController.getById(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
  });

  it('rejects non-UUID encounter ids with 400', async () => {
    mockReq = {
      user: { id: 'user-123' },
      headers: { authorization: 'Bearer token-xyz' },
      params: { id: "enc-456'; DROP TABLE encounters;--" },
    };

    mockedEncounterService.getEncounter.mockResolvedValueOnce(null as any);

    await encounterController.getById(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid encounter id' }));
    expect(mockedEncounterService.getEncounter).not.toHaveBeenCalled();
  });

  it('lists encounters for current user', async () => {
    mockReq = {
      user: { id: 'user-123' },
      headers: { authorization: 'Bearer token-xyz' },
    };

    const mockList = [{ id: 'enc-1' }, { id: 'enc-2' }];
    mockedEncounterService.getEncounters.mockResolvedValueOnce(mockList as any);

    await encounterController.list(mockReq as Request, mockRes as Response);

    expect(jsonMock).toHaveBeenCalledWith(mockList);
  });

  it('updates encounter status and severity', async () => {
    mockReq = {
      user: { id: 'user-123' },
      headers: { authorization: 'Bearer token-xyz' },
      params: { id: '3f2e5bb7-6c59-4a16-9a8e-1d13a2e0b421' },
      body: { status: 'resolved' },
    };

    const mockUpdated = { id: '3f2e5bb7-6c59-4a16-9a8e-1d13a2e0b421', status: 'resolved' };
    mockedEncounterService.updateEncounter.mockResolvedValueOnce(mockUpdated as any);

    await encounterController.updateStatus(mockReq as Request, mockRes as Response);

    expect(jsonMock).toHaveBeenCalledWith(mockUpdated);
    expect(mockedEncounterService.updateEncounter).toHaveBeenCalledWith(
      '3f2e5bb7-6c59-4a16-9a8e-1d13a2e0b421',
      'user-123',
      { status: 'resolved' },
      'token-xyz',
    );
  });

  it('deletes encounter successfully', async () => {
    mockReq = {
      user: { id: 'user-123' },
      headers: { authorization: 'Bearer token-xyz' },
      params: { id: '3f2e5bb7-6c59-4a16-9a8e-1d13a2e0b421' },
    };

    mockedEncounterService.deleteEncounter.mockResolvedValueOnce({ success: true } as any);

    await encounterController.remove(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(204);
    expect(sendMock).toHaveBeenCalled();
  });
});
