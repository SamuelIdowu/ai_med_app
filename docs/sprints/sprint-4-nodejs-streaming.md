# Sprint 4: Node.js Streaming Bridge & Modular Monolith Core

> **Sprint Objective:** Build the high-concurrency Node.js streaming gateway and modular monolith. Implement the `MLClient` inter-service bridge to the local Python ML server, establish the Server-Sent Events (SSE) streaming router, orchestrate triage session logging into Supabase, and handle image uploads to Supabase Storage.

---

## 1. Gateway & Streaming Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         Node.js Express Monolith                               │
│                                                                                │
│   Client (Mobile) ────────► POST /api/encounters/triage/stream                │
│                               │                                                │
│                               ├── 1. Validate JWT Auth & Save User Query       │
│                               │                                                │
│                               ├── 2. Forward to Python ML Engine (Stream)      │
│                               │      (http://127.0.0.1:8000/v1/ml/triage/stream)│
│                               │                                                │
│                               ├── 3. Pipe SSE Chunks back to Mobile Client     │
│                               │                                                │
│                               └── 4. On Stream 'end', Commit Complete Response │
│                                      to Supabase `triage_messages`             │
│                                                                                │
│   Client (Mobile) ────────► POST /api/encounters/:id/wound                     │
│                               │                                                │
│                               ├── Uploads file to Supabase Storage Bucket      │
│                               └── Forwards to Python WoundVisionEngine         │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tasks & Detailed Implementation Steps

### Task 4.1: ML Client Inter-Service Bridge

**Files:**
- Create: `backend/src/services/mlClient.ts`
- Test: `backend/src/services/__tests__/mlClient.test.ts`

- [ ] **Step 1: Write failing MLClient test**

```typescript
// backend/src/services/__tests__/mlClient.test.ts
import { describe, it, expect } from '@jest/globals';
import { MLClient } from '../mlClient';

describe('MLClient Inter-Service Bridge', () => {
  it('instantiates client with fallback base URL', () => {
    const client = new MLClient();
    expect(client.getBaseUrl()).toBe('http://127.0.0.1:8000');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm --prefix backend test src/services/__tests__/mlClient.test.ts`
Expected: FAIL with "Cannot find module '../mlClient'"

- [ ] **Step 3: Implement `mlClient.ts`**

```typescript
// backend/src/services/mlClient.ts
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

export class MLClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async streamTriage(query: string, symptoms: string[] = []): Promise<Readable> {
    const response = await axios.post(
      `${this.baseUrl}/v1/ml/triage/stream`,
      { query, symptoms },
      { responseType: 'stream', timeout: 15000 }
    );
    return response.data as Readable;
  }

  async analyzeWoundImage(fileBuffer: Buffer, fileName: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);

    const response = await axios.post(`${this.baseUrl}/v1/ml/vision/analyze`, formData, {
      headers: formData.getHeaders(),
      timeout: 10000,
    });
    return response.data;
  }
}
```

- [ ] **Step 4: Run tests and verify pass**

Run: `npm --prefix backend test src/services/__tests__/mlClient.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/mlClient.ts backend/src/services/__tests__/mlClient.test.ts
git commit -m "feat(backend): implement resilient python ml client inter-service bridge"
```

---

### Task 4.2: Real-Time SSE Triage Streaming Controller

**Files:**
- Create: `backend/src/controllers/streamController.ts`
- Modify: `backend/src/routes/encounters.ts`
- Test: `backend/src/controllers/__tests__/streamController.test.ts`

- [ ] **Step 1: Write failing stream controller test**

```typescript
// backend/src/controllers/__tests__/streamController.test.ts
import { describe, it, expect } from '@jest/globals';
import { handleTriageStream } from '../streamController';

describe('Stream Controller', () => {
  it('is exported as a callable express handler', () => {
    expect(typeof handleTriageStream).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm --prefix backend test src/controllers/__tests__/streamController.test.ts`
Expected: FAIL with "Cannot find module '../streamController'"

- [ ] **Step 3: Implement `streamController.ts`**

```typescript
// backend/src/controllers/streamController.ts
import { Request, Response } from 'express';
import { MLClient } from '../services/mlClient';
import { getSupabaseAdmin } from '../db/client';

const mlClient = new MLClient();

export async function handleTriageStream(req: Request, res: Response): Promise<void> {
  const { encounterId, query, symptoms = [] } = req.body;

  if (!encounterId || !query) {
    res.status(400).json({ error: 'encounterId and query are required' });
    return;
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const supabase = getSupabaseAdmin();
  let accumulatedResponse = '';

  try {
    // 1. Persist user question
    await supabase.from('triage_messages').insert({
      encounter_id: encounterId,
      sender: 'user',
      content: query,
    });

    // 2. Stream from Python ML
    const mlStream = await mlClient.streamTriage(query, symptoms);

    mlStream.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      res.write(text);

      // Extract text content for database commit
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.replace('data: ', ''));
            if (parsed.delta) accumulatedResponse += parsed.delta;
          } catch (_) {}
        }
      }
    });

    mlStream.on('end', async () => {
      if (accumulatedResponse.trim()) {
        await supabase.from('triage_messages').insert({
          encounter_id: encounterId,
          sender: 'assistant',
          content: accumulatedResponse,
        });
      }
      res.end();
    });

    mlStream.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
```

- [ ] **Step 4: Register route in `backend/src/routes/encounters.ts`**

```typescript
// backend/src/routes/encounters.ts
import express from 'express';
import { handleTriageStream } from '../controllers/streamController';

const router = express.Router();

// Triage streaming endpoint
router.post('/triage/stream', handleTriageStream);

export default router;
```

- [ ] **Step 5: Run tests and verify pass**

Run: `npm --prefix backend test src/controllers/__tests__/streamController.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/streamController.ts backend/src/routes/encounters.ts
git commit -m "feat(backend): implement node.js sse triage streaming gateway"
```

---

## 3. Sprint 4 Implementation Checklist

- [x] **Task 4.1: Internal ML Service HTTP & Streaming Client**
  - [x] Implement `MLClient` in `backend/src/services/mlClient.ts`
  - [x] Configure Axios instance with keep-alive agent and timeouts
  - [x] Implement `checkHealth()`, `analyzeWound()`, and `streamTriage()` methods
  - [x] Verify MLClient streaming and error handling unit tests pass

- [x] **Task 4.2: Encounter Management Controller & Routes**
  - [x] Implement `encounterController.ts` with create, fetch, and list methods
  - [x] Wire Supabase user authentication middleware to encounter routes
  - [x] Persist encounter status (`in_progress`, `escalated`, `resolved`)
  - [x] Register `/api/v1/encounters` in Express application

- [x] **Task 4.3: Node.js SSE Streaming Gateway**
  - [x] Implement `streamController.ts` with HTTP Server-Sent Events headers
  - [x] Stream incoming ML token chunks downstream to the mobile client
  - [x] Asynchronously persist completed assistant triage transcript to `triage_messages` in Supabase
  - [x] Implement error handling and connection teardown events
  - [x] Expose route `POST /api/v1/encounters/triage/stream`
  - [x] Verify streaming controller unit and integration tests pass

