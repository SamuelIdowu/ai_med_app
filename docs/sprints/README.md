# 🚀 AI Med App: Master Engineering Roadmap & Sprints

> **Architecture:** Local Python ML Engine + Supabase (PostgreSQL 16 & pgvector) + Node.js Streaming Gateway + React Native Expo Mobile App + Reference-Driven Native UI System (Direct in Code).

---

## 📅 Sprint Overview & Execution Sequence

```
┌────────────────────────────────────────────────────────────────────────┐
│ Sprint 1: Native UI Redesign & Atomic Component Architecture (In Code) │
│ └── Theme engine, tactile atoms, Home, Live Triage, Wound & Med ID     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Sprint 2: Supabase PostgreSQL & pgvector Database Layer                │
│ └── Relational medical schema, pgvector HNSW index, RLS, storage S3    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Sprint 3: Local Python ML Subsystem (Training, Fine-Tuning & Serving)  │
│ └── Safety red-flags, LoRA fine-tuning, wound CV, FastAPI streaming    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Sprint 4: Node.js Streaming Bridge & Modular Monolith Core             │
│ └── MLClient inter-service bridge, SSE streaming router, encounters   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Sprint 5: Mobile Client Integration & Offline SQLite Sync              │
│ └── Wire live SSE streaming, camera capture & local offline SQLite     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Sprint 6: End-to-End Integration, Evaluation & Production Hardening    │
│ └── Clinical safety benchmarks, E2E tests, docker-compose orchestration│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📑 Detailed Sprint Documentation

| Sprint | Focus Area | Detailed Specification Link |
| :--- | :--- | :--- |
| **Sprint 1** | **Native UI Redesign (Direct in Code)** | [`docs/sprints/sprint-1-direct-code-redesign.md`](file:///c:/Users/USER/Desktop/saas%20projects/ai-med-app/docs/sprints/sprint-1-direct-code-redesign.md) |
| **Sprint 2** | **Supabase DB & pgvector** | [`docs/sprints/sprint-2-supabase-pgvector.md`](file:///c:/Users/USER/Desktop/saas%20projects/ai-med-app/docs/sprints/sprint-2-supabase-pgvector.md) |
| **Sprint 3** | **Local Python ML Engine** | [`docs/sprints/sprint-3-local-python-ml.md`](file:///c:/Users/USER/Desktop/saas%20projects/ai-med-app/docs/sprints/sprint-3-local-python-ml.md) |
| **Sprint 4** | **Node.js Streaming Monolith** | [`docs/sprints/sprint-4-nodejs-streaming.md`](file:///c:/Users/USER/Desktop/saas%20projects/ai-med-app/docs/sprints/sprint-4-nodejs-streaming.md) |
| **Sprint 5** | **Mobile Integration & Offline** | [`docs/sprints/sprint-5-mobile-ui-offline.md`](file:///c:/Users/USER/Desktop/saas%20projects/ai-med-app/docs/sprints/sprint-5-mobile-ui-offline.md) |
| **Sprint 6** | **E2E & Production Hardening** | [`docs/sprints/sprint-6-e2e-and-evaluation.md`](file:///c:/Users/USER/Desktop/saas%20projects/ai-med-app/docs/sprints/sprint-6-e2e-and-evaluation.md) |

---

## ✅ Master Engineering Execution Checklist

- [x] **Sprint 1: Native UI Redesign & Atomic Component Architecture (Direct in Code)**
  - [x] Task 1.1: Native Medical Theme Engine & Design Tokens
  - [x] Task 1.2: Reusable Tactile UI Atoms (MedicalCard, TactileButton, FilterPills, StatCard, EmergencyBanner)
  - [x] Task 1.3: Clinical Data Visualizations & Charts (VitalsAreaChart, ConcentricVitalsRing, ClinicalBarChart)
  - [x] Task 1.4: Conversational AI Triage & Action Cards (ThingsYouCanDoCards, FloatingChatInput)
  - [x] Task 1.5: Screen Redesigns & Full Application Assembly (HomeScreen, AIChatScreen, MedicalProfileScreen)

- [x] **Sprint 2: Supabase PostgreSQL & pgvector Database Layer**
  - [x] Task 2.1: Medical Relational Schema & pgvector Migration
  - [x] Task 2.2: Private Medical S3 Storage Bucket & Photo Upload Helper
  - [x] Task 2.3: Medical Protocol Chunking & pgvector Embedding Seeder

- [x] **Sprint 3: Local Python ML Subsystem (Training, Fine-Tuning & Serving)**
  - [x] Task 3.1: Python Environment & Red-Flag Clinical Safety Engine
  - [x] Task 3.2: Clinical Triage LoRA Fine-Tuning Pipeline
  - [x] Task 3.3: Local Wound Computer Vision Classifier
  - [x] Task 3.4: Dense Vector Embedding Engine (384-dim)
  - [x] Task 3.5: FastAPI Server & SSE Triage Streaming Endpoints

- [x] **Sprint 4: Node.js Streaming Bridge & Modular Monolith Core**
  - [x] Task 4.1: Internal ML Service HTTP & Streaming Client
  - [x] Task 4.2: Encounter Management Controller & Routes
  - [x] Task 4.3: Node.js SSE Streaming Gateway & Supabase Message Logging

- [x] **Sprint 5: Mobile Client Integration & Offline SQLite Sync**
  - [x] Task 5.1: Mobile Streaming Client & SSE Chunk Parser
  - [x] Task 5.2: Offline SQLite Medical Cache & Guideline Sync
  - [x] Task 5.3: Camera Capture & Wound Assessment Upload
  - [x] Task 5.4: Live Triage Screen Assembly & Dynamic UI Integration

- [x] **Sprint 6: End-to-End Integration, Evaluation & Production Hardening**
  - [x] Task 6.1: Medical Safety Evaluation Benchmarks (10 Clinical Red-Flag Cases)
  - [x] Task 6.2: End-to-End Integration Flow Tests
  - [x] Task 6.3: Local Multi-Service Container Orchestration (docker-compose)


