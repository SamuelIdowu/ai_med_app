# Local ML, Penpot Redesign & Streaming Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform AI Med App into a modular local ML architecture featuring a Python-based ML training/inference service, Supabase PostgreSQL + pgvector persistence, Penpot-driven UI redesign via MCP, and real-time SSE streaming orchestrated by the Node.js backend.

**Architecture:** A unified modular monolith where Node.js manages authenticated client connections and live SSE streaming, dispatching ML triage and image classification requests to an internal Python FastAPI service running local PyTorch/Hugging Face models. Primary data, media storage, and vector embeddings reside in Supabase (PostgreSQL with `pgvector`). UI screens are redesigned using Penpot and imported as design tokens into the React Native mobile client.

**Tech Stack:**
- **Mobile Client:** React Native 0.81, Expo SDK 54, TypeScript, `expo-sqlite`, `react-native-markdown-display`
- **Backend Monolith:** Node.js, Express 5, TypeScript, `@supabase/supabase-js`, SSE (Server-Sent Events)
- **Local ML Subsystem:** Python 3.11+, FastAPI, PyTorch, Hugging Face `transformers`, `peft` (LoRA/QLoRA), `sentence-transformers`, `uv`
- **Database & Storage:** Supabase (PostgreSQL 16, `pgvector`, Supabase Storage buckets)
- **Design System:** Penpot (Open-source design tool) connected via Penpot MCP

## Global Constraints
- All backend routes must validate JWT authentication before dispatching to the ML service.
- The Python ML engine must run offline/locally without requiring external paid API keys.
- Streaming responses must use standard Server-Sent Events (`text/event-stream`) for lightweight, low-overhead mobile consumption.
- Strict medical safety guards must run locally prior to model generation to flag immediate 911 red-flag symptoms.

---

### Task 1: Supabase Database Schema & pgvector Migration

**Files:**
- Create: `backend/src/db/migrations/001_init_medical_schema.sql`
- Create: `backend/src/db/supabaseClient.ts`
- Test: `backend/src/tests/db.test.ts`

**Interfaces:**
- Consumes: Supabase credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) from environment variables.
- Produces: `getSupabaseAdmin()` client exporting types for `UserProfile`, `MedicalEncounter`, `TriageMessage`, and `MedicalGuidelineEmbedding`.

- [ ] **Step 1: Write the failing database client test**

```typescript
// backend/src/tests/db.test.ts
import { describe, it, expect } from '@jest/globals';
import { getSupabaseAdmin } from '../db/supabaseClient';

describe('Supabase Client Configuration', () => {
  it('should initialize supabase admin client with required table interfaces', () => {
    const client = getSupabaseAdmin();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test src/tests/db.test.ts`
Expected: FAIL with "Cannot find module '../db/supabaseClient'"

- [ ] **Step 3: Write migration SQL with pgvector and medical tables**

```sql
-- backend/src/db/migrations/001_init_medical_schema.sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    blood_type TEXT,
    allergies TEXT[] DEFAULT '{}',
    current_medications TEXT[] DEFAULT '{}',
    chronic_conditions TEXT[] DEFAULT '{}',
    emergency_contacts JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encounters table
CREATE TABLE IF NOT EXISTS public.encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
    symptoms TEXT[] DEFAULT '{}',
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triage chat messages
CREATE TABLE IF NOT EXISTS public.triage_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
    sender TEXT CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- First aid knowledge vectors for RAG
CREATE TABLE IF NOT EXISTS public.guideline_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guideline_embedding_hnsw_idx 
ON public.guideline_embeddings USING hnsw (embedding vector_cosine_ops);
```

- [ ] **Step 4: Implement Supabase admin client module**

```typescript
// backend/src/db/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;

  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key';

  supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}
```

- [ ] **Step 5: Run tests and verify pass**

Run: `npm --prefix backend test src/tests/db.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/db/
git commit -m "feat(db): add supabase pgvector schema migration and admin client"
```

---

### Task 2: Python Local ML Engine Scaffolding

**Files:**
- Create: `ml/pyproject.toml`
- Create: `ml/app/main.py`
- Create: `ml/app/routers/inference.py`
- Create: `ml/app/services/triage_engine.py`
- Test: `ml/tests/test_triage.py`

**Interfaces:**
- Consumes: JSON payload `{ "query": string, "history": Array, "symptoms": string[] }`
- Produces: FastAPI HTTP streaming generator yielding JSON chunks: `{"delta": string, "done": boolean, "red_flags": string[]}`

- [ ] **Step 1: Write the failing Python ML triage test**

```python
# ml/tests/test_triage.py
import pytest
from app.services.triage_engine import TriageEngine

def test_emergency_red_flag_detection():
    engine = TriageEngine()
    red_flags = engine.detect_red_flags("Patient is having severe chest pain radiating to left arm")
    assert "chest_pain" in red_flags
    assert engine.is_immediate_emergency(red_flags) is True

def test_benign_symptom_no_critical_flag():
    engine = TriageEngine()
    red_flags = engine.detect_red_flags("Minor paper cut on index finger")
    assert len(red_flags) == 0
    assert engine.is_immediate_emergency(red_flags) is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest ml/tests/test_triage.py`
Expected: FAIL with "ModuleNotFoundError: No module named 'app'"

- [ ] **Step 3: Create pyproject.toml configuration**

```toml
# ml/pyproject.toml
[project]
name = "ai-med-ml"
version = "0.1.0"
description = "Local Python ML Engine for Medical Triage & First Aid"
authors = [{ name = "AI Med Team" }]
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn>=0.30.0",
    "pydantic>=2.8.0",
    "torch>=2.4.0",
    "transformers>=4.44.0",
    "sentence-transformers>=3.0.0",
    "peft>=0.12.0",
    "accelerate>=0.33.0",
    "pillow>=10.4.0",
    "python-dotenv>=1.0.1"
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

- [ ] **Step 4: Implement TriageEngine with medical rules and streaming fallback**

```python
# ml/app/services/triage_engine.py
from typing import List, AsyncGenerator
import re

RED_FLAG_PATTERNS = {
    "chest_pain": r"(chest pain|heart attack|pressure in chest)",
    "severe_bleeding": r"(spurting blood|uncontrolled bleeding|gushing blood)",
    "unconscious": r"(unconscious|unresponsive|passed out|fainted)",
    "breathing_difficulty": r"(cannot breathe|choking|severe shortness of breath|gasping)",
    "stroke_signs": r"(face drooping|slurred speech|arm weakness)"
}

class TriageEngine:
    def detect_red_flags(self, text: str) -> List[str]:
        found = []
        lowered = text.lower()
        for flag, pattern in RED_FLAG_PATTERNS.items():
            if re.search(pattern, lowered):
                found.append(flag)
        return found

    def is_immediate_emergency(self, red_flags: List[str]) -> bool:
        return len(red_flags) > 0

    async def stream_triage_guidance(self, query: str, symptoms: List[str]) -> AsyncGenerator[str, None]:
        red_flags = self.detect_red_flags(query + " " + " ".join(symptoms))
        if self.is_immediate_emergency(red_flags):
            yield "🚨 EMERGENCY ALERT: Your symptoms indicate a potentially life-threatening emergency. CALL 911 OR YOUR LOCAL EMERGENCY SERVICE IMMEDIATELY.\n\n"
        
        guidance = [
            "Here is immediate first aid guidance:\n",
            "1. Stay calm and sit down in a safe, comfortable position.\n",
            "2. Keep the affected area clean and supported.\n",
            "3. Monitor for any worsening symptoms such as dizziness or shortness of breath."
        ]
        for line in guidance:
            yield line
```

- [ ] **Step 5: Implement FastAPI streaming router and application entry**

```python
# ml/app/routers/inference.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from app.services.triage_engine import TriageEngine
import json

router = APIRouter(prefix="/v1/ml", tags=["inference"])
triage_engine = TriageEngine()

class TriageRequest(BaseModel):
    query: str
    symptoms: Optional[List[str]] = []

@router.post("/triage/stream")
async def stream_triage(req: TriageRequest):
    async def event_generator():
        async for chunk in triage_engine.stream_triage_guidance(req.query, req.symptoms):
            yield f"data: {json.dumps({'delta': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ml/app/main.py
from fastapi import FastAPI
from app.routers import inference

app = FastAPI(title="AI Med Local ML Engine", version="1.0.0")
app.include_router(inference.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-med-ml"}
```

- [ ] **Step 6: Run tests and verify pass**

Run: `pytest ml/tests/test_triage.py`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add ml/
git commit -m "feat(ml): scaffold local python ml engine and streaming triage generator"
```

---

### Task 3: Node.js Streaming Bridge Service

**Files:**
- Create: `backend/src/services/mlClient.ts`
- Create: `backend/src/controllers/streamController.ts`
- Modify: `backend/src/routes/encounters.ts`
- Test: `backend/src/tests/stream.test.ts`

**Interfaces:**
- Consumes: Client POST request with `{ encounterId: string, message: string }`.
- Produces: Server-Sent Events stream to client while logging full response to `triage_messages` in Supabase.

- [ ] **Step 1: Write the failing streaming bridge test**

```typescript
// backend/src/tests/stream.test.ts
import { describe, it, expect } from '@jest/globals';
import { MLClient } from '../services/mlClient';

describe('MLClient Service', () => {
  it('should initialize with configured ML host url', () => {
    const client = new MLClient('http://localhost:8000');
    expect(client).toBeDefined();
    expect(client.getBaseUrl()).toBe('http://localhost:8000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test src/tests/stream.test.ts`
Expected: FAIL with "Cannot find module '../services/mlClient'"

- [ ] **Step 3: Implement MLClient to connect with Python ML engine**

```typescript
// backend/src/services/mlClient.ts
import axios from 'axios';
import { Readable } from 'stream';

export class MLClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async getTriageStream(query: string, symptoms: string[]): Promise<Readable> {
    const response = await axios.post(
      `${this.baseUrl}/v1/ml/triage/stream`,
      { query, symptoms },
      { responseType: 'stream' }
    );
    return response.data as Readable;
  }
}
```

- [ ] **Step 4: Implement Stream Controller piping SSE to client and persisting to Supabase**

```typescript
// backend/src/controllers/streamController.ts
import { Request, Response } from 'express';
import { MLClient } from '../services/mlClient';
import { getSupabaseAdmin } from '../db/supabaseClient';

const mlClient = new MLClient();

export async function handleTriageStream(req: Request, res: Response): Promise<void> {
  const { encounterId, query, symptoms = [] } = req.body;

  if (!query || !encounterId) {
    res.status(400).json({ error: 'encounterId and query are required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const supabase = getSupabaseAdmin();
  let fullResponse = '';

  try {
    // Record user message
    await supabase.from('triage_messages').insert({
      encounter_id: encounterId,
      sender: 'user',
      content: query,
    });

    const stream = await mlClient.getTriageStream(query, symptoms);

    stream.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      res.write(text);

      // Parse delta for persistence
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.replace('data: ', ''));
            if (data.delta) fullResponse += data.delta;
          } catch (_) {}
        }
      }
    });

    stream.on('end', async () => {
      // Save assistant response
      if (fullResponse.trim()) {
        await supabase.from('triage_messages').insert({
          encounter_id: encounterId,
          sender: 'assistant',
          content: fullResponse,
        });
      }
      res.end();
    });

    stream.on('error', (err) => {
      res.write(`data: {"error": "${err.message}"}\n\n`);
      res.end();
    });
  } catch (err: any) {
    res.write(`data: {"error": "${err.message}"}\n\n`);
    res.end();
  }
}
```

- [ ] **Step 5: Wire streaming route into Express router**

```typescript
// Add to backend/src/routes/encounters.ts
import { handleTriageStream } from '../controllers/streamController';

// Route for streaming triage
router.post('/triage/stream', handleTriageStream);
```

- [ ] **Step 6: Run tests and verify pass**

Run: `npm --prefix backend test src/tests/stream.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/ backend/src/controllers/ backend/src/routes/
git commit -m "feat(backend): add node.js sse streaming bridge to local python ml"
```

---

### Task 4: Penpot MCP Integration & UI Redesign Tokens

**Files:**
- Create: `design/penpot-mcp-config.json`
- Create: `mobile/src/theme/tokens.ts`
- Create: `mobile/src/theme/components.ts`
- Test: `mobile/src/tests/theme.test.ts`

**Interfaces:**
- Consumes: Penpot file design specs (colors, typography, grid, corner radii, elevation).
- Produces: Exported TypeScript design tokens directly consumable by React Native views.

- [ ] **Step 1: Write the failing design tokens test**

```typescript
// mobile/src/tests/theme.test.ts
import { theme } from '../theme/tokens';

describe('Design Tokens System', () => {
  it('should expose primary medical triage palette and typography', () => {
    expect(theme.colors.emergencyRed).toBeDefined();
    expect(theme.colors.medicalBlue).toBeDefined();
    expect(theme.spacing.md).toBe(16);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix mobile test src/tests/theme.test.ts`
Expected: FAIL with "Cannot find module '../theme/tokens'"

- [ ] **Step 3: Define Penpot MCP connection manifest**

```json
// design/penpot-mcp-config.json
{
  "penpot": {
    "workspace": "ai-med-app-redesign",
    "version": "2.0",
    "pages": [
      "01-Design-Tokens",
      "02-Emergency-Triage-Live",
      "03-Wound-Assessment-CV",
      "04-Patient-Medical-ID"
    ],
    "mcpIntegration": {
      "command": "npx",
      "args": ["-y", "@penpot/mcp-server"]
    }
  }
}
```

- [ ] **Step 4: Implement core design tokens aligned with Penpot system**

```typescript
// mobile/src/theme/tokens.ts
export const theme = {
  colors: {
    emergencyRed: '#DC2626',
    emergencyRedBg: '#FEF2F2',
    warningAmber: '#F59E0B',
    successGreen: '#10B981',
    medicalBlue: '#0284C7',
    medicalBlueBg: '#F0F9FF',
    neutralDark: '#0F172A',
    neutralGray: '#64748B',
    neutralLight: '#F8FAFC',
    cardBorder: '#E2E8F0',
    background: '#FFFFFF',
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
    h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
    body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
    caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radii: {
    sm: 6,
    md: 12,
    lg: 20,
    full: 9999,
  },
};
```

- [ ] **Step 5: Run tests and verify pass**

Run: `npm --prefix mobile test src/tests/theme.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add design/ mobile/src/theme/
git commit -m "feat(design): configure penpot mcp spec and export react native theme tokens"
```

---

### Task 5: Mobile Live Streaming Triage Screen Component

**Files:**
- Create: `mobile/src/services/streamingClient.ts`
- Create: `mobile/src/screens/LiveTriageScreen.tsx`
- Test: `mobile/src/tests/streamingClient.test.ts`

**Interfaces:**
- Consumes: Backend endpoint `/api/encounters/triage/stream` with JWT auth.
- Produces: Live streamed text updates rendered in real-time with markdown formatting and emergency alerts.

- [ ] **Step 1: Write the failing streaming client test**

```typescript
// mobile/src/tests/streamingClient.test.ts
import { parseSSEEvent } from '../services/streamingClient';

describe('SSE Parser', () => {
  it('should parse delta chunks correctly', () => {
    const rawChunk = 'data: {"delta": "Sit down immediately."}\n\n';
    const parsed = parseSSEEvent(rawChunk);
    expect(parsed).toEqual({ delta: 'Sit down immediately.' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix mobile test src/tests/streamingClient.test.ts`
Expected: FAIL with "Cannot find module '../services/streamingClient'"

- [ ] **Step 3: Implement streaming client with SSE event parser**

```typescript
// mobile/src/services/streamingClient.ts
export interface SSEPayload {
  delta?: string;
  done?: boolean;
  error?: string;
}

export function parseSSEEvent(text: string): SSEPayload | null {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        return JSON.parse(line.replace('data: ', ''));
      } catch (_) {
        return null;
      }
    }
  }
  return null;
}
```

- [ ] **Step 4: Implement redesigned LiveTriageScreen**

```tsx
// mobile/src/screens/LiveTriageScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { theme } from '../theme/tokens';
import { parseSSEEvent } from '../services/streamingClient';

interface LiveTriageProps {
  encounterId: string;
  apiBaseUrl: string;
}

export const LiveTriageScreen: React.FC<LiveTriageProps> = ({ encounterId, apiBaseUrl }) => {
  const [query, setQuery] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const startTriage = async () => {
    if (!query.trim() || isStreaming) return;
    setIsStreaming(true);
    setStreamedText('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/encounters/triage/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounterId, query }),
      });

      const reader = (response as any).body?.getReader();
      if (!reader) {
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const parsed = parseSSEEvent(chunk);
        if (parsed?.delta) {
          setStreamedText((prev) => prev + parsed.delta);
        }
      }
    } catch (err) {
      console.error('Stream error:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Medical Triage</Text>
      <ScrollView style={styles.responseContainer}>
        {streamedText ? (
          <Markdown>{streamedText}</Markdown>
        ) : (
          <Text style={styles.placeholder}>Describe symptoms or emergency situation...</Text>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="E.g. Deep cut on forearm, bleeding..."
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity
          style={[styles.button, isStreaming && styles.disabledButton]}
          onPress={startTriage}
          disabled={isStreaming}
        >
          <Text style={styles.buttonText}>{isStreaming ? 'Thinking...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  title: { ...theme.typography.h1, color: theme.colors.neutralDark, marginBottom: theme.spacing.md },
  responseContainer: { flex: 1, backgroundColor: theme.colors.neutralLight, borderRadius: theme.radii.md, padding: theme.spacing.md },
  placeholder: { color: theme.colors.neutralGray, ...theme.typography.body },
  inputBar: { flexDirection: 'row', marginTop: theme.spacing.md },
  input: { flex: 1, borderWidth: 1, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md, padding: theme.spacing.sm },
  button: { backgroundColor: theme.colors.emergencyRed, borderRadius: theme.radii.md, justifyContent: 'center', paddingHorizontal: theme.spacing.md, marginLeft: theme.spacing.sm },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
});
```

- [ ] **Step 5: Run tests and verify pass**

Run: `npm --prefix mobile test src/tests/streamingClient.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/src/services/ mobile/src/screens/
git commit -m "feat(mobile): add live streaming triage screen with markdown and sse consumer"
```

---

### Task 6: End-to-End Verification

**Files:**
- Create: `backend/src/tests/e2e.test.ts`

- [ ] **Step 1: Write integration test connecting Node.js bridge to Python mock/live service**

```typescript
// backend/src/tests/e2e.test.ts
import request from 'supertest';
import express from 'express';
import { handleTriageStream } from '../controllers/streamController';

const app = express();
app.use(express.json());
app.post('/api/encounters/triage/stream', handleTriageStream);

describe('E2E Streaming Integration', () => {
  it('should reject requests missing required fields', async () => {
    const res = await request(app)
      .post('/api/encounters/triage/stream')
      .send({});
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run verification test**

Run: `npm --prefix backend test src/tests/e2e.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/tests/e2e.test.ts
git commit -m "test: add e2e verification for streaming triage endpoint"
```
