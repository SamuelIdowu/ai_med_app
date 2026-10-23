// backend/src/controllers/streamController.ts
// Real-Time SSE Triage Streaming Gateway & Wound Upload Handler

import { Request, Response } from 'express';
import path from 'path';
import { MLClient } from '../services/mlClient';
import { getSupabaseAdmin } from '../db/client';

let mlClientInstance: MLClient | null = null;

export function getMLClient(): MLClient {
  if (!mlClientInstance) {
    mlClientInstance = new MLClient();
  }
  return mlClientInstance;
}

export function setMLClient(client: MLClient | null): void {
  mlClientInstance = client;
}

const STORAGE_BUCKET = 'medical-images';

/**
 * Handles HTTP Server-Sent Events (SSE) streaming triage sessions
 */
export async function handleTriageStream(req: Request, res: Response): Promise<void> {
  const { encounterId, query, symptoms = [] } = req.body;
  const userId = (req as any).user?.id;

  if (!encounterId || !query) {
    res.status(400).json({ error: 'encounterId and query are required' });
    return;
  }

  const supabase = getSupabaseAdmin();

  // Enforce encounter ownership to prevent IDOR / cross-tenant tampering
  if (userId) {
    const { data: encounter, error: encError } = await supabase
      .from('encounters')
      .select('id, user_id')
      .eq('id', encounterId)
      .maybeSingle();

    if (encError || !encounter) {
      res.status(404).json({ error: 'Encounter not found' });
      return;
    }

    if (encounter.user_id !== userId) {
      res.status(403).json({ error: 'Unauthorized access to this encounter' });
      return;
    }
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const mlClient = getMLClient();
  let accumulatedResponse = '';

  try {
    // 1. Persist initial user question to Supabase
    await supabase.from('triage_messages').insert({
      encounter_id: encounterId,
      sender: 'user',
      content: query,
    });

    // 2. Stream tokens from Python ML Engine
    const mlStream = await mlClient.streamTriage(query, symptoms);

    // Teardown listener for client abort
    req.on('close', () => {
      if (mlStream && typeof (mlStream as any).destroy === 'function') {
        (mlStream as any).destroy();
      }
    });

    mlStream.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString();
      res.write(text);

      // Accumulate text content for triage transcript commit
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const rawJson = line.slice(6).trim();
            if (rawJson && rawJson !== '[DONE]') {
              const parsed = JSON.parse(rawJson);
              if (parsed.delta) {
                accumulatedResponse += parsed.delta;
              } else if (parsed.content) {
                accumulatedResponse += parsed.content;
              } else if (parsed.token) {
                accumulatedResponse += parsed.token;
              }
            }
          } catch {
            // Non-JSON or plain text stream chunk
          }
        }
      }
    });

    mlStream.on('end', async () => {
      if (accumulatedResponse.trim()) {
        try {
          await supabase.from('triage_messages').insert({
            encounter_id: encounterId,
            sender: 'assistant',
            content: accumulatedResponse.trim(),
          });
        } catch (dbErr) {
          console.error('Failed to commit assistant triage transcript to Supabase:', dbErr);
        }
      }
      res.end();
    });

    mlStream.on('error', (err: Error) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('ML Streaming error');
      }
      res.write(`data: ${JSON.stringify({ error: 'Triage service temporarily unavailable' })}\n\n`);
      res.end();
    });
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('handleTriageStream exception');
    }
    res.write(`data: ${JSON.stringify({ error: 'Stream processing failed' })}\n\n`);
    res.end();
  }
}

/**
 * Handles wound image upload to Supabase Storage, invokes ML vision analysis, and logs assessment
 */
export async function handleWoundUpload(req: Request, res: Response): Promise<void> {
  try {
    const encounterId = req.params.id;
    const userId = (req as any).user?.id;
    const { image, fileName = `wound-${Date.now()}.jpg` } = req.body;

    if (!image) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    const supabase = getSupabaseAdmin();

    // Enforce encounter ownership to prevent unauthorized wound image injection
    if (userId) {
      const { data: encounter, error: encError } = await supabase
        .from('encounters')
        .select('id, user_id')
        .eq('id', encounterId)
        .maybeSingle();

      if (encError || !encounter) {
        res.status(404).json({ error: 'Encounter not found' });
        return;
      }

      if (encounter.user_id !== userId) {
        res.status(403).json({ error: 'Unauthorized access to this encounter' });
        return;
      }
    }

    // Convert base64 data URL or raw base64 to Buffer
    let rawBuffer: Buffer;
    if (typeof image === 'string') {
      const cleanBase64 = image.includes(';base64,') ? image.split(';base64,')[1] : image;
      rawBuffer = Buffer.from(cleanBase64, 'base64');
    } else if (Buffer.isBuffer(image)) {
      rawBuffer = image;
    } else {
      res.status(400).json({ error: 'Invalid image format' });
      return;
    }

    const { ImageProcessingService } = require('../services/imageProcessingService');
    try {
      const validation = await ImageProcessingService.validateImage(rawBuffer);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.errors.join(', ') });
        return;
      }
    } catch {
      res.status(400).json({ error: 'Invalid image' });
      return;
    }

    const processed = await ImageProcessingService.processImage(rawBuffer);
    const imageBuffer = processed.buffer;
    const contentType = processed.mimeType;

    const mlClient = getMLClient();
    const safeFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = userId
      ? `${userId}/${encounterId}/${Date.now()}-${safeFileName}`
      : `encounters/${encounterId}/${Date.now()}-${safeFileName}`;

    // 1. Upload file to Supabase private medical-images bucket
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, imageBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Supabase storage upload error');
      }
      res.status(500).json({ error: 'Storage upload failed' });
      return;
    }

    // 2. Invoke Python ML vision analysis
    let analysis;
    try {
      analysis = await mlClient.analyzeWoundImage(imageBuffer, fileName);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Wound analysis failed');
      }
      res.status(503).json({ error: 'Wound analysis unavailable' });
      return;
    }

    // 3. Persist wound assessment record in Supabase
    const validSeverityGrades = ['mild', 'moderate', 'severe'];
    const dbSeverity = validSeverityGrades.includes(analysis.severity_grade)
      ? analysis.severity_grade
      : null;

    const { data: assessment, error: dbError } = await supabase
      .from('wound_assessments')
      .insert({
        encounter_id: encounterId,
        storage_path: storagePath,
        classification: analysis.classification || 'unknown',
        confidence: analysis.confidence || 0.0,
        severity_grade: dbSeverity,
        annotations: analysis.annotations || {},
      })
      .select()
      .single();

    if (dbError) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to log wound assessment to Supabase');
      }
      res.status(500).json({ error: 'Failed to save assessment' });
      return;
    }

    try {
      const { logAudit } = require('../services/auditService');
      if (userId) {
        logAudit({
          userId,
          action: 'UPLOAD_WOUND_IMAGE',
          resourceType: 'PHOTO',
          resourceId: encounterId,
          ipAddress: req.ip,
          userAgent: req.get?.('user-agent'),
          metadata: { storagePath },
        });
      }
    } catch {}

    res.status(201).json({
      assessment,
      analysis,
      storagePath,
    });
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in handleWoundUpload');
    }
    res.status(500).json({ error: 'Wound upload and analysis failed' });
  }
}
