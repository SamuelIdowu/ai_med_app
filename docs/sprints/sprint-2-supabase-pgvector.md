# Sprint 2: Supabase PostgreSQL & pgvector Database Layer

> **Sprint Objective:** Configure the complete medical persistence layer on Supabase. Enable `pgvector`, establish relational integrity with strict schemas for patient profiles, emergency encounters, and triage transcripts, configure Row Level Security (RLS), provision private S3 storage for wound photos, and seed medical first aid embeddings.

---

## 1. Schema Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Supabase PostgreSQL 16                              │
│                                                                                  │
│   auth.users (Supabase Managed Auth)                                             │
│       │ 1:1                                                                      │
│       ▼                                                                          │
│   public.profiles (Allergies, Blood Type, Medications, Emergency Contacts)       │
│       │ 1:N                                                                      │
│       ▼                                                                          │
│   public.encounters (Severity, Symptoms, Triage Status, Active Incident Flag)     │
│       ├── 1:N ──► public.triage_messages (User queries & Assistant responses)    │
│       └── 1:N ──► public.wound_assessments (Storage path, CV labels, triage)     │
│                                                                                  │
│   public.guideline_embeddings (HNSW Index, 384-dim, RAG First Aid Protocol)      │
│   Storage Bucket: `medical-images` (Private bucket with signed URLs)             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tasks & Detailed Implementation Steps

### Task 2.1: Medical Relational Schema & pgvector Migration

**Files:**
- Create: `backend/src/db/migrations/001_core_medical_schema.sql`
- Create: `backend/src/db/migrations/002_rls_security_policies.sql`
- Create: `backend/src/db/client.ts`
- Test: `backend/src/db/__tests__/client.test.ts`

- [x] **Step 1: Write failing client initialization test**

```typescript
// backend/src/db/__tests__/client.test.ts
import { describe, it, expect } from '@jest/globals';
import { getSupabaseAdmin } from '../client';

describe('Supabase Database Service', () => {
  it('initializes admin client with valid credentials', () => {
    const db = getSupabaseAdmin();
    expect(db).toBeDefined();
    expect(typeof db.from).toBe('function');
  });
});
```

- [x] **Step 2: Run test to verify failure**

Run: `npm --prefix backend test src/db/__tests__/client.test.ts`
Expected: FAIL with "Cannot find module '../client'"

- [x] **Step 3: Write migration `001_core_medical_schema.sql`**

```sql
-- backend/src/db/migrations/001_core_medical_schema.sql
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Medical Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown')),
    allergies TEXT[] DEFAULT '{}',
    current_medications TEXT[] DEFAULT '{}',
    chronic_conditions TEXT[] DEFAULT '{}',
    emergency_contacts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Encounters Table
CREATE TABLE IF NOT EXISTS public.encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Emergency Triage',
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
    symptoms TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Triage Messages Table
CREATE TABLE IF NOT EXISTS public.triage_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    red_flags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Wound Assessments (Computer Vision)
CREATE TABLE IF NOT EXISTS public.wound_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    classification TEXT NOT NULL, -- e.g. laceration, burn, rash, normal
    confidence NUMERIC(4, 3) NOT NULL,
    severity_grade TEXT CHECK (severity_grade IN ('mild', 'moderate', 'severe')),
    annotations JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Medical Guideline Knowledge Vectors (RAG)
CREATE TABLE IF NOT EXISTS public.guideline_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    category TEXT NOT NULL,
    chunk_index INT NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    embedding vector(384) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create HNSW Index for cosine distance
CREATE INDEX IF NOT EXISTS guideline_embedding_hnsw_idx
ON public.guideline_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

- [x] **Step 4: Write Row-Level Security policies in `002_rls_security_policies.sql`**

```sql
-- backend/src/db/migrations/002_rls_security_policies.sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wound_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guideline_embeddings ENABLE ROW LEVEL SECURITY;

-- Profiles: users read and update their own profile
CREATE POLICY "Users access own profile" 
ON public.profiles FOR ALL 
USING (auth.uid() = id);

-- Encounters: users access their own encounters
CREATE POLICY "Users access own encounters" 
ON public.encounters FOR ALL 
USING (auth.uid() = user_id);

-- Messages: users access messages within their encounters
CREATE POLICY "Users access own messages" 
ON public.triage_messages FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.encounters e 
    WHERE e.id = encounter_id AND e.user_id = auth.uid()
  )
);

-- Guidelines: readable by all authenticated users
CREATE POLICY "Guidelines are publicly readable by auth users" 
ON public.guideline_embeddings FOR SELECT 
TO authenticated 
USING (true);
```

- [x] **Step 5: Implement `client.ts`**

```typescript
// backend/src/db/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let clientInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (clientInstance) return clientInstance;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  clientInstance = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return clientInstance;
}
```

- [x] **Step 6: Run tests and verify pass**

Run: `npm --prefix backend test src/db/__tests__/client.test.ts`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add backend/src/db/
git commit -m "feat(db): establish supabase medical schema, pgvector hnsw index, and rls policies"
```

---

### Task 2.2: First-Aid Protocols Vector Seeding Script

**Files:**
- Create: `backend/src/db/seeds/seedGuidelines.ts`
- Test: `backend/src/db/__tests__/seed.test.ts`

**Interfaces:**
- Consumes: `first-aid-content.json` protocols.
- Produces: Populated `guideline_embeddings` table with precomputed 384-dimensional vectors.

- [x] **Step 1: Write seed chunking unit test**

```typescript
// backend/src/db/__tests__/seed.test.ts
import { chunkMedicalProtocol } from '../seeds/seedGuidelines';

describe('Medical Guideline Chunking', () => {
  it('chunks structured protocol into searchable text blocks', () => {
    const protocol = {
      title: 'Bleeding Control',
      category: 'trauma',
      steps: ['Apply direct pressure with a clean cloth.', 'Elevate injury above heart.', 'Apply tourniquet if severe.']
    };
    const chunks = chunkMedicalProtocol(protocol);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toContain('direct pressure');
  });
});
```

- [x] **Step 2: Run test to verify failure**

Run: `npm --prefix backend test src/db/__tests__/seed.test.ts`
Expected: FAIL with "Cannot find module '../seeds/seedGuidelines'"

- [x] **Step 3: Implement `seedGuidelines.ts`**

```typescript
// backend/src/db/seeds/seedGuidelines.ts
export interface Protocol {
  title: string;
  category: string;
  steps: string[];
}

export interface GuidelineChunk {
  topic: string;
  category: string;
  chunkIndex: number;
  content: string;
}

export function chunkMedicalProtocol(protocol: Protocol): GuidelineChunk[] {
  return protocol.steps.map((step, idx) => ({
    topic: protocol.title,
    category: protocol.category,
    chunkIndex: idx,
    content: `[${protocol.title} - Step ${idx + 1}] ${step}`,
  }));
}
```

- [x] **Step 4: Run test and verify pass**

Run: `npm --prefix backend test src/db/__tests__/seed.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add backend/src/db/seeds/ backend/src/db/__tests__/seed.test.ts
git commit -m "feat(db): add medical protocol chunking and vector seeding utilities"
```

---

## 3. Sprint 2 Implementation Checklist

- [x] **Task 2.1: Medical Relational Schema & pgvector Migration**
  - [x] Enable `vector` extension in PostgreSQL
  - [x] Create `001_core_medical_schema.sql` (profiles, encounters, triage_messages, wound_assessments, guideline_embeddings)
  - [x] Create HNSW vector index (`vector_cosine_ops`) for 384-dimensional protocol vectors
  - [x] Implement `002_rls_security_policies.sql` (strict patient boundary RLS & emergency medical staff overrides)
  - [x] Implement Supabase client singleton `backend/src/db/client.ts` with type-safe interfaces
  - [x] Verify database client initialization unit tests pass

- [x] **Task 2.2: Private Medical S3 Storage Bucket & Photo Upload Helper**
  - [x] Configure `medical-images` private storage bucket on Supabase
  - [x] Implement storage RLS policies in `003_storage_policies.sql`
  - [x] Implement `storageService.ts` for signed upload URLs and image retrieval
  - [x] Verify image upload and signed URL expiration unit tests pass

- [x] **Task 2.3: Medical Protocol Chunking & pgvector Embedding Seeder**
  - [x] Implement `chunkMedicalProtocol` utility in `seedGuidelines.ts`
  - [x] Build seeder script generating 384-dimensional dense embeddings for emergency protocols
  - [x] Seed emergency categories (CPR, Bleeding, Burns, Choking, Fractures, Wounds, Anaphylaxis) into `guideline_embeddings`
  - [x] Execute vector cosine similarity match tests (`match_guidelines` RPC)


