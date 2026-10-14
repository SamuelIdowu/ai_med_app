// backend/src/tests/e2e_full_system.test.ts
// Comprehensive End-to-End Test Suite for All Features

import request from 'supertest';
import app from '../app';
import { getSupabaseAdmin } from '../db/client';
import { EventEmitter } from 'events';
import { setMLClient } from '../controllers/streamController';

describe('Comprehensive End-to-End (E2E) System Test Suite', () => {
  let supabase: any;
  let testUserId: string;
  let testUserEmail: string;
  let testUserToken: string;
  let createdEncounterId: string;
  let createdNotificationId: string;
  const testPassword = 'E2eTestPassword123!';
  const uploadedStoragePaths: string[] = [];

  beforeAll(async () => {
    supabase = getSupabaseAdmin();
    testUserEmail = `e2e-patient-${Date.now()}@healthpulse-test.local`;

    // 1. Create a dedicated test user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { name: 'E2E Test Patient', role: 'patient' },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user for E2E suite: ${authError?.message}`);
    }

    testUserId = authData.user.id;

    // 2. Ensure user row exists in public.users
    await supabase.from('users').upsert({
      id: testUserId,
      email: testUserEmail,
      name: 'E2E Test Patient',
    });

    // 3. Sign in via isolated anon client to obtain a valid JWT access token
    const { createClient } = await import('@supabase/supabase-js');
    const anonClient = createClient(
      process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
      email: testUserEmail,
      password: testPassword,
    });

    if (sessionError || !sessionData.session) {
      throw new Error(`Failed to sign in test user for E2E suite: ${sessionError?.message}`);
    }

    testUserToken = sessionData.session.access_token;
  }, 30000);

  afterAll(async () => {
    try {
      // Clean up uploaded test images
      if (uploadedStoragePaths.length > 0) {
        await supabase.storage.from('medical-images').remove(uploadedStoragePaths);
      }

      // Clean up notifications
      if (testUserId) {
        await supabase.from('notifications').delete().eq('user_id', testUserId);
      }

      // Clean up encounters and associated child records
      if (createdEncounterId) {
        await supabase.from('triage_messages').delete().eq('encounter_id', createdEncounterId);
        await supabase.from('wound_assessments').delete().eq('encounter_id', createdEncounterId);
        await supabase.from('encounters').delete().eq('id', createdEncounterId);
      }
      if (testUserId) {
        await supabase.from('encounters').delete().eq('user_id', testUserId);
        await supabase.from('medical_profiles').delete().eq('user_id', testUserId);
        await supabase.from('users').delete().eq('id', testUserId);
        await supabase.auth.admin.deleteUser(testUserId);
      }
    } catch (cleanupErr) {
      console.warn('E2E teardown cleanup warning:', cleanupErr);
    }
  }, 30000);

  // -------------------------------------------------------------
  // Feature 1: Core Gateway & Health Checks
  // -------------------------------------------------------------
  describe('Feature 1: Gateway & Health Endpoints', () => {
    it('GET / responds with welcome service banner', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('AI First Aid App Backend is running');
    });

    it('GET /health responds with healthy system status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('ai-med-app-backend');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // Feature 2: Authentication & User Verification Flow
  // -------------------------------------------------------------
  describe('Feature 2: Authentication & User Check Flow', () => {
    it('POST /api/v1/auth/check confirms existence of existing user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/check')
        .send({ email: testUserEmail });

      expect(res.status).toBe(200);
      expect(res.body.exists).toBe(true);
    });

    it('POST /api/v1/auth/check confirms non-existence of unused email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/check')
        .send({ email: `nonexistent-${Date.now()}@healthpulse-test.local` });

      expect(res.status).toBe(200);
      expect(res.body.exists).toBe(false);
    });

    it('POST /api/v1/auth/check rejects missing email with 400 status', async () => {
      const res = await request(app)
        .post('/api/v1/auth/check')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email is required');
    });

    it('enforces authentication on protected routes without token', async () => {
      const res = await request(app).get('/api/v1/profile');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authorization header is missing');
    });

    it('rejects malformed or invalid JWT bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid or expired token');
    });
  });

  // -------------------------------------------------------------
  // Feature 3: Patient Medical Profile Management
  // -------------------------------------------------------------
  describe('Feature 3: Medical Profile Management Flow', () => {
    it('POST /api/v1/profile upserts complete patient medical history', async () => {
      const profilePayload = {
        fullName: 'Jane Test Doe',
        blood_type: 'O+',
        allergies: ['Penicillin', 'Peanuts'],
        conditions: ['Asthma'],
        medications: ['Albuterol inhaler'],
        emergency_contact: {
          name: 'John Doe',
          phone: '+1-555-0199',
          relationship: 'Spouse',
        },
      };

      const res = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(profilePayload);

      expect(res.status).toBe(200);
      expect(res.body.user_id).toBe(testUserId);
      expect(res.body.blood_type).toBe('O+');
      expect(res.body.allergies).toContain('Penicillin');
      expect(res.body.conditions).toContain('Asthma');
    });

    it('GET /api/v1/profile fetches the persisted medical profile', async () => {
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user_id).toBe(testUserId);
      expect(res.body.blood_type).toBe('O+');
      expect(res.body.allergies).toEqual(expect.arrayContaining(['Penicillin', 'Peanuts']));
      expect(res.body.conditions).toEqual(expect.arrayContaining(['Asthma']));
    });
  });

  // -------------------------------------------------------------
  // Feature 4: Emergency Encounters Lifecycle
  // -------------------------------------------------------------
  describe('Feature 4: Emergency Encounters Lifecycle Flow', () => {
    it('POST /api/v1/encounters creates a new emergency encounter', async () => {
      const encounterPayload = {
        title: 'Deep Laceration from Broken Glass',
        severity: 'high',
        status: 'active',
        symptoms: ['bleeding', 'severe pain'],
        notes: 'Hand laceration occurred while washing kitchen glassware',
      };

      const res = await request(app)
        .post('/api/v1/encounters')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(encounterPayload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.user_id).toBe(testUserId);
      expect(res.body.title).toBe('Deep Laceration from Broken Glass');
      expect(res.body.severity).toBe('high');
      expect(res.body.status).toBe('active');

      createdEncounterId = res.body.id;
    });

    it('POST /api/v1/encounters rejects invalid severity values', async () => {
      const res = await request(app)
        .post('/api/v1/encounters')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          title: 'Invalid Test',
          severity: 'extreme-apocalypse',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid severity');
    });

    it('GET /api/v1/encounters lists all encounters for user', async () => {
      const res = await request(app)
        .get('/api/v1/encounters')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const match = res.body.find((e: any) => e.id === createdEncounterId);
      expect(match).toBeDefined();
      expect(match.title).toBe('Deep Laceration from Broken Glass');
    });

    it('GET /api/v1/encounters/:id retrieves single encounter details', async () => {
      const res = await request(app)
        .get(`/api/v1/encounters/${createdEncounterId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdEncounterId);
      expect(res.body.severity).toBe('high');
    });

    it('PATCH /api/v1/encounters/:id/status updates status and severity', async () => {
      const res = await request(app)
        .patch(`/api/v1/encounters/${createdEncounterId}/status`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          status: 'resolved',
          severity: 'low',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('resolved');
      expect(res.body.severity).toBe('low');
    });

    it('POST /api/v1/encounters/:id/photos validates required fileName', async () => {
      const res = await request(app)
        .post(`/api/v1/encounters/${createdEncounterId}/photos`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('fileName is required');
    });
  });

  // -------------------------------------------------------------
  // Feature 5: Real-Time AI Triage Streaming (SSE)
  // -------------------------------------------------------------
  describe('Feature 5: Real-Time AI Triage Streaming (SSE) Flow', () => {
    it('streams triage guidance tokens and saves transcript to Supabase', async () => {
      const mockStream = new EventEmitter();
      const mockMLClient = {
        streamTriage: jest.fn().mockImplementation(async () => {
          setTimeout(() => {
            mockStream.emit('data', Buffer.from('data: {"delta": "Apply continuous firm pressure on the wound."}\n\n'));
            setTimeout(() => {
              mockStream.emit('end');
            }, 25);
          }, 15);
          return mockStream;
        }),
        analyzeWoundImage: jest.fn(),
      };
      setMLClient(mockMLClient as any);

      const res = await request(app)
        .post('/api/v1/encounters/triage/stream')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          encounterId: createdEncounterId,
          query: 'How do I stop severe hand bleeding immediately?',
          symptoms: ['bleeding', 'pain'],
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/event-stream/);
      expect(res.text).toContain('Apply continuous firm pressure on the wound.');

      // Check DB persistence in triage_messages
      const { data: messages } = await supabase
        .from('triage_messages')
        .select('*')
        .eq('encounter_id', createdEncounterId);

      expect(messages).toBeDefined();
      expect(messages.length).toBeGreaterThanOrEqual(1);
      expect(messages.some((m: any) => m.sender === 'user')).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Feature 6: Wound Vision & Media Assessment
  // -------------------------------------------------------------
  describe('Feature 6: Wound Vision Assessment Flow', () => {
    it('POST /api/v1/encounters/:id/wound uploads image and records clinical classification', async () => {
      const mockMLClient = {
        streamTriage: jest.fn(),
        analyzeWoundImage: jest.fn().mockResolvedValue({
          classification: 'puncture_wound',
          confidence: 0.94,
          severity_grade: 'moderate',
          annotations: { estimated_size_cm: 2 },
        }),
      };
      setMLClient(mockMLClient as any);

      const sampleImageBuffer = Buffer.from('TEST_E2E_WOUND_IMAGE_PAYLOAD');
      const res = await request(app)
        .post(`/api/v1/encounters/${createdEncounterId}/wound`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          image: sampleImageBuffer.toString('base64'),
          fileName: `e2e-wound-test-${Date.now()}.jpg`,
        });

      expect(res.status).toBe(201);
      expect(res.body.analysis).toBeDefined();
      expect(res.body.analysis.classification).toBe('puncture_wound');
      expect(res.body.analysis.severity_grade).toBe('moderate');

      if (res.body.storagePath) {
        uploadedStoragePaths.push(res.body.storagePath);
      }

      // Verify Supabase record
      const { data: record } = await supabase
        .from('wound_assessments')
        .select('*')
        .eq('encounter_id', createdEncounterId)
        .single();

      expect(record).toBeDefined();
      expect(record.classification).toBe('puncture_wound');
    });

    it('rejects wound upload when image data is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/encounters/${createdEncounterId}/wound`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Image data is required');
    });
  });

  // -------------------------------------------------------------
  // Feature 7: Healthcare Providers Directory
  // -------------------------------------------------------------
  describe('Feature 7: Healthcare Providers Directory Flow', () => {
    let existingProviderId: string;

    it('GET /api/v1/providers lists available medical facilities', async () => {
      const res = await request(app)
        .get('/api/v1/providers')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].name).toBeDefined();

      existingProviderId = res.body[0].id;
    });

    it('GET /api/v1/providers/:id returns provider details for valid ID', async () => {
      const res = await request(app)
        .get(`/api/v1/providers/${existingProviderId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(existingProviderId);
      expect(res.body.name).toBeDefined();
    });

    it('GET /api/v1/providers/:id returns 404 for unknown provider ID', async () => {
      const res = await request(app)
        .get('/api/v1/providers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Provider not found');
    });
  });

  // -------------------------------------------------------------
  // Feature 8: Clinical Reports & PDF Generation
  // -------------------------------------------------------------
  describe('Feature 8: Clinical Reports & PDF Generation Flow', () => {
    it('POST /api/v1/reports/:id/generate builds official clinical PDF document', async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${createdEncounterId}/generate`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain(`report-${createdEncounterId}.pdf`);

      // Verify that the body is a valid PDF (starts with %PDF-)
      const pdfHeader = res.body.slice(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');
    });

    it('GET /api/v1/reports/:id returns informative 501 for unpersisted reports', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/${createdEncounterId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(501);
      expect(res.body.message).toContain('Stored reports not yet implemented');
    });
  });

  // -------------------------------------------------------------
  // Feature 9: Push Notifications System
  // -------------------------------------------------------------
  describe('Feature 9: Push Notifications System Flow', () => {
    it('POST /api/v1/notifications/test dispatches and logs notification', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/test')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          title: 'Emergency Service Dispatched',
          message: 'An ambulance has been dispatched to your current location.',
          type: 'alert',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/notifications retrieves notification history for user', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const matched = res.body.find((n: any) => n.title === 'Emergency Service Dispatched');
      expect(matched).toBeDefined();
      expect(matched.read).toBe(false);

      createdNotificationId = matched.id;
    });

    it('PATCH /api/v1/notifications/:id/read marks notification as read', async () => {
      if (!createdNotificationId) return;

      const res = await request(app)
        .patch(`/api/v1/notifications/${createdNotificationId}/read`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify read flag is now true
      const { data: updated } = await supabase
        .from('notifications')
        .select('read')
        .eq('id', createdNotificationId)
        .single();

      expect(updated.read).toBe(true);
    });

    it('POST /api/v1/notifications/register-token rejects invalid non-Expo token', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/register-token')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ token: 'invalid-non-expo-token' });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('not a valid Expo push token');
    });
  });

  // -------------------------------------------------------------
  // Feature 10: AI First Aid Validation & Rate Limiting
  // -------------------------------------------------------------
  describe('Feature 10: AI First Aid Validation & Rate Limiting Flow', () => {
    it('POST /api/v1/ai/chat rejects request missing message payload', async () => {
      const res = await request(app)
        .post('/api/v1/ai/chat')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_MESSAGE');
    });

    it('POST /api/v1/ai/analyze rejects request missing image payload', async () => {
      const res = await request(app)
        .post('/api/v1/ai/analyze')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_IMAGE');
    });

    it('enforces rate limiting headers on AI endpoints', async () => {
      const res = await request(app)
        .post('/api/v1/ai/chat')
        .send({});

      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
    });
  });
});
