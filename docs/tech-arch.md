# Technical Architecture Document — AI First Aid App (MVP)

> Deliverable: Lean, implementation-ready technical architecture for the MVP (profile-personalized first-aid, offline rule engine, guided photo capture, report sharing, provider directory).
> Format: Markdown (copyable).
> Audience: Solo founder / dev + future engineers.

---

## 1 — System Overview (one paragraph)

The app is a mobile-first system with a cross-platform client (React Native recommended) that provides offline-capable first-aid flows, secure user medical profiles, guided photo capture, and an export/share feature for emergency reports. The backend provides user management, encrypted storage of PHI (photos & profiles), a rule-based first-aid engine (authoritative content), provider directory, analytics, and admin utilities. The MVP avoids automated medical diagnosis; AI/ML is out of scope for this release.

---

## 2 — Goals & Constraints

* **Goals:** safe, fast access to first-aid steps; secure storage & sharing of PHI; offline-first core flows; fast time-to-MVP with minimal infra overhead.
* **Constraints:** Solo founder build → prefer managed services (Supabase, Vercel, Firebase) to reduce ops load. Privacy/security critical: encryption in transit and at rest, user consent, minimal retention. Regulatory caution: no diagnostic claims.

---

## 3 — High-level Architecture Components

```
Mobile App (React Native)
  ├─ Offline first-aid content (bundled)
  ├─ Local encrypted photo store
  ├─ Auth via backend (token)
  └─ Sync queue for uploads/reports

Backend API (Node.js / TypeScript, serverless or small container)
  ├─ Auth & User Management (Clerk / Supabase Auth)
  ├─ Profile CRUD API (encrypted fields)
  ├─ First-Aid Rule Engine (server cache; no ML)
  ├─ Photo & Report Service (signed URLs, encrypted storage)
  ├─ Provider Directory Service
  └─ Audit & Analytics Service

Storage
  ├─ PostgreSQL (user/profile/encounters/metadata)
  └─ Object Storage (S3 / Supabase storage for encrypted photos & report packages)

Monitoring & Observability
  ├─ Sentry (crash reporting)
  ├─ PostHog / Firebase Analytics (product metrics)
  └─ Prometheus / Managed metrics (if self-hosting)

DevOps / CI-CD
  ├─ GitHub Actions (builds, tests, deploy)
  └─ Vercel / Render / Heroku for backend (or small VPS for cost control)
```

---

## 4 — Technology Choices (recommended for solo founder MVP)

* **Mobile:** React Native + Expo (fast iteration, easier builds)
* **Backend runtime:** Node.js + TypeScript (Express or Fastify), or use serverless functions (Vercel / Netlify functions)
* **Database:** PostgreSQL — hosted via Supabase (provides auth, storage, realtime if needed)
* **File storage:** Supabase Storage or AWS S3 (with server-side encryption + KMS)
* **Auth:** Supabase Auth or Clerk (support phone & email)
* **Push notifications:** Firebase Cloud Messaging (FCM); Expo Push if using Expo
* **Crash reporting:** Sentry
* **Analytics:** PostHog (self-hostable) or Firebase Analytics
* **CI/CD:** GitHub Actions → Vercel / Render / Supabase Deploy
* **Encryption & Key Management:** Cloud KMS (AWS KMS / GCP KMS) or Supabase encryption at rest; additional app-level AES-256 encryption for sensitive blobs (client-side encryption optional)
* **Maps:** Google Maps / Apple Maps for provider directory links
* **Payment & Billing (future):** Stripe (if monetizing later)

Rationale: Supabase + Vercel + Expo reduces operational overhead, speeds the solo dev workflow, and gives an integrated stack for authentication and storage.

---

## 5 — Data Model (lean, normalized)

### Core tables (PostgreSQL)

```sql
users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  phone text,
  name text,
  created_at timestamptz,
  updated_at timestamptz
)

medical_profiles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  dob date,
  blood_type text,
  allergies jsonb,       -- array of strings
  medications jsonb,     -- array of objects {name, dose}
  conditions jsonb,      -- array of strings
  emergency_contacts jsonb, -- [{name, phone, relation}]
  encrypted_meta bytea,  -- optional client-side encrypted blob summary
  created_at timestamptz,
  updated_at timestamptz
)

encounters (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  type text,             -- 'emergency', 'practice', 'report'
  category text,         -- 'bleeding','burn','choking',...
  notes text,
  created_at timestamptz
)

photos (
  id uuid PRIMARY KEY,
  encounter_id uuid REFERENCES encounters(id),
  storage_path text,     -- S3/Supabase path (encrypted object)
  iv bytea,              -- if client-side encrypted with AES-GCM
  created_at timestamptz
)

reports (
  id uuid PRIMARY KEY,
  encounter_id uuid REFERENCES encounters(id),
  report_path text,      -- generated PDF/package path
  shared_with jsonb,     -- [{method: 'whatsapp', recipient: '+...'}]
  created_at timestamptz
)

providers (
  id uuid PRIMARY KEY,
  name text,
  type text,
  address text,
  phone text,
  lat numeric,
  lng numeric,
  created_at timestamptz
)

audit_logs (
  id uuid PRIMARY KEY,
  user_id uuid,
  action text,
  metadata jsonb,
  created_at timestamptz
)
```

Notes:

* Use `jsonb` for flexible fields (allergies, medications).
* PHI blobs (photos, sensitive notes) must be encrypted at object storage level and referenced in DB only as metadata.
* For additional security, consider storing object encryption keys outside the DB (KMS or separate secrets store).

---

## 6 — API Design (RESTful, JSON)

### Auth

* `POST /api/v1/auth/signup` — email/phone signup (returns token)
* `POST /api/v1/auth/login` — login
* `POST /api/v1/auth/verify` — phone/email verify

### Profile

* `GET /api/v1/profile` — get current user profile
* `POST /api/v1/profile` — create/update profile

  * payload: `{dob, blood_type, allergies:[], medications:[], conditions:[], emergency_contacts:[]}`
* `DELETE /api/v1/profile` — delete profile (GDPR/consent flows)

### Emergency Flow & Encounters

* `POST /api/v1/encounters` — start encounter

  * payload: `{type, category, notes}`
  * returns encounter id
* `GET /api/v1/encounters/:id` — fetch encounter details
* `POST /api/v1/encounters/:id/photos` — create photo upload session

  * returns signed upload URL and metadata accepted
* `POST /api/v1/encounters/:id/share` — generate & share report

  * payload: `{share_methods: ['email','whatsapp'], recipients: [...]}`

### Photos & Reports

* `GET /api/v1/photos/:id` — returns signed URL for client to download (checks authorization)
* `POST /api/v1/reports/:id/generate` — backend job to assemble PDF/report
* `GET /api/v1/reports/:id` — signed URL to report

### Provider Directory

* `GET /api/v1/providers?lat=&lng=&type=&q=` — search providers
* `GET /api/v1/providers/:id` — provider details

### Admin & Audit

* `GET /api/v1/admin/analytics` — metrics for admin (protected)
* `GET /api/v1/admin/audit_logs?user_id=` — audit logs

Security:

* All endpoints require Bearer token (JWT) in `Authorization` header.
* Token lifespan short; refresh tokens flow if needed.
* Rate limit critical endpoints (e.g., report generation) to prevent abuse.

---

## 7 — File Storage & Encryption Strategy

### Object storage

* Use Supabase Storage or AWS S3.
* Configure server-side encryption (SSE-KMS).
* Store object metadata in `photos` table; never store raw PHI directly in DB.

### Additional (recommended) client-side encryption for photos

* Flow:

  * Client creates AES-256-GCM key per photo.
  * Client encrypts image locally; keeps IV.
  * Client requests a one-time signed upload URL from backend.
  * Backend returns pre-signed URL for object storage.
  * Client uploads encrypted blob.
  * Client sends photo metadata (storage path, iv, key_encrypted_with_kms?) to backend.
* Key storage:

  * Either: encrypt AES keys with a server-side KMS (AWS KMS) and store the encrypted key in DB.
  * Or: Do not persist raw keys on server; request ephemeral access for downloads requiring user interaction.

Rationale: client-side encryption reduces exposure risk in case object storage is compromised.

---

## 8 — Offline & Sync Model (mobile)

* Ship static first-aid content bundled with app (JSON).
* On app startup (when online) check for content updates (versioned).
* Local store:

  * Use SQLite or SecureStore (Expo SecureStore / react-native-encrypted-storage) for profile & photos.
  * Photos cached encrypted locally until synced.
* Sync queue:

  * When user initiates a share/report or network is available, enqueue uploads:

    1. Create encounter via API.
    2. Request signed upload URL(s).
    3. Upload encrypted blobs.
    4. Notify backend of completed uploads.
    5. Request report generation.
* Conflict resolution:

  * Last-write wins for profile edits; provide manual export for sensitive edits.

---

## 9 — Background Jobs & Workers

Use a lightweight queue (e.g., serverless functions + managed queue) for:

* Report generation (assemble PDF, watermark consent, encrypt if required).
* Photo virus or safety scanning (optional).
* Sending emails (via SendGrid) or push notifications.
* Analytics ingestion/aggregation.

For MVP, start with simple serverless functions triggered by DB insert events (Supabase can trigger webhooks) or scheduled jobs.

---

## 10 — Infrastructure & Deployment

### Recommended stacks & hosting (MVP lean)

* Frontend: Expo + EAS builds (Android/iOS)
* Backend: Vercel (serverless functions) or Render (small container)
* Database: Supabase (Postgres)
* Storage: Supabase Storage (or AWS S3)
* Auth: Supabase Auth or Clerk
* CI/CD: GitHub Actions → deploy to Vercel/Render on `main`
* Secrets: GitHub Secrets + cloud KMS for production keys
* Monitoring: Sentry + PostHog

### Deployment topology (ASCII)

```
Users
  ↕ (TLS)
React Native App (Expo)
  ↕ (TLS)
Vercel Functions / API Gateway ----> Supabase Postgres (DB)
                                  \
                                   -> Supabase Storage / S3 (encrypted)
                                   -> KMS (key management)
                                   -> Sentry / PostHog (monitoring)
```

Scaling:

* Use serverless endpoints to avoid managing infra early.
* Database: use managed Postgres with vertical scaling; shard/index as necessary.
* Storage: scale via S3.

---

## 11 — CI/CD, Testing, & Release Strategy

* GitFlow: `main` protected; PRs for features.
* GitHub Actions:

  * `lint` + `type-check` job
  * `unit tests` job (Jest)
  * `e2e` job (Detox / Playwright for JS)
  * `build` job for mobile (EAS) on release branch
  * `deploy` job for backend (Vercel / Render)
* Pre-release QA:

  * Automated tests
  * Manual smoke test checklist (emergency flow, offline start, photo capture, report generation)
* Release:

  * Internal pilot via TestFlight / Play Store beta
  * Soft launch in single market

---

## 12 — Security, Privacy & Compliance (practical checklist)

### Security

* TLS everywhere (enforce HTTPS)
* JWT tokens signed with secure key (rotate periodically)
* Rate limiting, IP throttling for public endpoints
* Input validation + sanitize uploads
* WAF if exposing public services

### Privacy

* Explicit consent on onboarding for PHI & photos
* Data export & delete endpoints for users
* Store minimal PII in DB; keep sensitive objects encrypted
* Data retention policy: default auto-delete photos after X days unless user chooses to keep

### Compliance (MVP pragmatic)

* Avoid making diagnostic claims in UI/copy to reduce SaMD exposure
* Maintain audit logs for each action (who accessed what and when)
* Engage legal counsel before expanding into HIPAA-heavy markets (US)
* For EU users, ensure GDPR controls (data subject requests, legal basis for processing)

---

## 13 — Observability & Incident Response

* **Monitoring:** Sentry for crashes, PostHog for product usage. Track emergency flow starts, completions, report shares, errors.
* **Alerting:** Email + Slack alerts for critical errors, high crash rates, or job failures.
* **Incident response:** Runbook: Triage → Contain (disable feature if needed) → Notify affected users (if PII breach) → Remediate → Postmortem.
* **Backups:** Daily DB backups retained per policy; test restores monthly.

---

## 14 — Cost Considerations (MVP rough)

* Supabase (small tier) + Vercel hobby + Expo EAS: low monthly cost (~$50–$200) initially.
* Storage and bandwidth depend on photo usage — optimize by limiting photo sizes and retention.
* Sentry & PostHog free tiers are fine early; upgrade as traffic grows.
* Budget for legal consultation and clinician validation in early pilot (~$1k–$5k depending on locale).

---

## 15 — Future-proofing (next phases)

* Add clinician dashboard & secure clinician authentication (B2B).
* Add on-device ML for image quality checks and non-diagnostic guidance.
* Add teleconsultation via WebRTC and verified clinician marketplace.
* Harden compliance (HIPAA-ready infra, business associate agreements).
* Multi-region deployment, localized emergency numbers, and translations.

---

## 16 — Sequence: Typical User Story Walkthrough (technical steps)

**User opens app, starts Emergency → shares report**

1. App opens; local content loads from bundled JSON. If online, sync new content.
2. User taps EMERGENCY → app reads flow steps from local DB and renders first step.
3. User follows steps; optionally taps “Take Photo.”
4. Photo capture:

   * Client encrypts photo (AES-GCM) locally.
   * Client requests upload metadata from `POST /api/v1/encounters` -> gets encounter id and signed URL.
   * Client uploads encrypted photo blob to storage.
   * Client notifies backend of upload completion (photo metadata + IV).
5. User taps “Share Report”:

   * Client calls `POST /api/v1/reports/:id/generate`.
   * Backend job fetches profile, encounter, photos, assembles PDF (server-side or serverless), stores report in encrypted storage, returns signed URL.
   * Client opens system share-sheet with signed URL or downloads and attaches to share.
6. Backend logs audit entry for report generation and share method.

---

## 17 — Developer File Structure (example)

```
/mobile
  /assets
  /src
    /components
    /screens
    /services   # auth, api, storage, encryption helpers
    /hooks
    /navigation
    /constants
/backend
  /src
    /routes
    /controllers
    /services  # s3, pdf-gen, email
    /jobs
    /middleware
  /tests
  /Dockerfile (if containerized)
  /serverless.yml (if using serverless)
```

---

## 18 — Implementation Roadmap (technical milestones)

**Week 0–2**

* Repo bootstrap (mobile + backend)
* Auth integration (Supabase/Clerk)
* DB schema migration scripts
* Bundle first-aid JSON content

**Week 3–6**

* Build emergency flow UI + offline content
* Profile CRUD & encryption tests
* Photo capture + local encrypted store
* Create encounter & upload flow to backend

**Week 7–10**

* Report generation pipeline (PDF assembly)
* Provider directory endpoints + map links
* Analytics + crash reporting
* Pilot testing setup & Beta builds

**Week 11–12**

* Fix pilot feedback, harden security, release to soft-launch

---

## 19 — Open Questions / Decisions for You (pick quickly)

1. Do you want to prioritize **Expo (React Native)** or **Flutter**? (Expo recommended for solo speed)
2. Will you use **Supabase** for DB + Auth + Storage (fast path) or assemble AWS services yourself? (Supabase recommended for MVP)
3. Do you want **client-side encryption** for photos now or rely on server-side SSE-KMS only? (Client-side adds complexity but improves security)
4. Which market / country to soft-launch in first? This affects provider data and content localization.

---

## 20 — Quick Next Steps I can produce for you right now

Pick any and I’ll deliver immediately:

* Postgres migration SQL + seed data for providers.
* Complete API contract (OpenAPI/Swagger spec).
* Example serverless function code for `encounters` + signed upload URL + report generation.
* Client sample code for photo encryption + upload flow (React Native).
* Minimal Dockerfile & GitHub Actions workflow for CI.

---
