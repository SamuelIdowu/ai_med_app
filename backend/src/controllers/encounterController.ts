// backend/src/controllers/encounterController.ts
// Emergency Encounter Management Controller

import { Request, Response } from 'express';
import * as encounterService from '../services/encounterService';
import { logAudit } from '../services/auditService';

const VALID_STATUSES = ['active', 'in_progress', 'escalated', 'resolved'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const token = req.headers.authorization?.split(' ')[1] || '';

    if (!userId) {
      res.status(401).json({ error: 'User must be authenticated to create an encounter' });
      return;
    }

    const { title, severity = 'medium', status = 'active', symptoms = [] } = req.body;

    if (severity && !VALID_SEVERITIES.includes(severity)) {
      res.status(400).json({ error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` });
      return;
    }

    if (status && !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }

    const encounterPayload = {
      title: title || 'Emergency Triage',
      severity,
      status,
      symptoms,
      ...req.body,
    };

    const encounter = await encounterService.createEncounter(userId, encounterPayload, token);
    logAudit({
      userId,
      action: 'CREATE_ENCOUNTER',
      resourceType: 'ENCOUNTER',
      resourceId: encounter.id,
      ipAddress: req.ip,
      userAgent: req.get?.('user-agent'),
      metadata: { severity, status },
    });
    res.status(201).json(encounter);
  } catch (error: any) {
    console.error('Error in encounterController.create:', error);
    res.status(500).json({ error: error.message || 'Failed to create encounter' });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const encounterId = req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'User must be authenticated' });
      return;
    }

    const encounter = await encounterService.getEncounter(encounterId, userId, token);
    if (!encounter) {
      res.status(404).json({ message: 'Encounter not found' });
      return;
    }

    logAudit({
      userId,
      action: 'VIEW_ENCOUNTER',
      resourceType: 'ENCOUNTER',
      resourceId: encounterId,
      ipAddress: req.ip,
      userAgent: req.get?.('user-agent'),
    });

    res.json(encounter);
  } catch (error: any) {
    console.error('Error in encounterController.getById:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve encounter' });
  }
};

export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const token = req.headers.authorization?.split(' ')[1] || '';

    if (!userId) {
      res.status(401).json({ error: 'User must be authenticated' });
      return;
    }

    const encounters = await encounterService.getEncounters(userId, token);
    logAudit({
      userId,
      action: 'LIST_ENCOUNTERS',
      resourceType: 'ENCOUNTER',
      ipAddress: req.ip,
      userAgent: req.get?.('user-agent'),
      metadata: { count: encounters.length },
    });
    res.json(encounters);
  } catch (error: any) {
    console.error('Error in encounterController.list:', error);
    res.status(500).json({ error: error.message || 'Failed to list encounters' });
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const encounterId = req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'User must be authenticated' });
      return;
    }

    const { status, severity, title, symptoms } = req.body;
    const updates: Record<string, any> = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
        return;
      }
      updates.status = status;
    }

    if (severity !== undefined) {
      if (!VALID_SEVERITIES.includes(severity)) {
        res.status(400).json({ error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` });
        return;
      }
      updates.severity = severity;
    }

    if (title !== undefined) updates.title = title;
    if (symptoms !== undefined) updates.symptoms = symptoms;

    const updated = await encounterService.updateEncounter(encounterId, userId, updates, token);
    logAudit({
      userId,
      action: 'UPDATE_ENCOUNTER',
      resourceType: 'ENCOUNTER',
      resourceId: encounterId,
      ipAddress: req.ip,
      userAgent: req.get?.('user-agent'),
      metadata: updates,
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error in encounterController.updateStatus:', error);
    res.status(500).json({ error: error.message || 'Failed to update encounter' });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const encounterId = req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'User must be authenticated' });
      return;
    }

    await encounterService.deleteEncounter(encounterId, userId, token);
    logAudit({
      userId,
      action: 'DELETE_ENCOUNTER',
      resourceType: 'ENCOUNTER',
      resourceId: encounterId,
      ipAddress: req.ip,
      userAgent: req.get?.('user-agent'),
    });
    res.status(204).send();
  } catch (error: any) {
    console.error('Error in encounterController.remove:', error);
    res.status(500).json({ error: error.message || 'Failed to delete encounter' });
  }
};
