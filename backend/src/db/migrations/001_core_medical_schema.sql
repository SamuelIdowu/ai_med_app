-- backend/src/db/migrations/001_core_medical_schema.sql
-- Sprint 2: Core Medical Schema & pgvector Configuration

-- Enable pgvector extension for dense medical guideline embeddings
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
    medical_directives TEXT[] DEFAULT '{}',
    emergency_notes TEXT,
    emergency_contacts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Encounters Table (Emergency triage sessions)
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

-- 4. Wound Assessments (Computer Vision analysis & wound tracking)
CREATE TABLE IF NOT EXISTS public.wound_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    classification TEXT NOT NULL, -- e.g. laceration, burn, rash, puncture, normal
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

-- Create HNSW Index for cosine distance on 384-dimension embeddings
CREATE INDEX IF NOT EXISTS guideline_embedding_hnsw_idx
ON public.guideline_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- RPC helper for semantic vector search
CREATE OR REPLACE FUNCTION match_guidelines (
  query_embedding vector(384),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  topic text,
  category text,
  chunk_index int,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    guideline_embeddings.id,
    guideline_embeddings.topic,
    guideline_embeddings.category,
    guideline_embeddings.chunk_index,
    guideline_embeddings.content,
    (1 - (guideline_embeddings.embedding <=> query_embedding))::float AS similarity
  FROM guideline_embeddings
  WHERE (1 - (guideline_embeddings.embedding <=> query_embedding)) > match_threshold
  ORDER BY guideline_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
