# Backend Implementation Checklist

Based on the verification against `docs/tech-arch.md` and `docs/prd.md`, the following tasks are required to complete the backend implementation.

## 1. Foundation & Configuration
- [x] **Environment Setup**:
    - [x] Verify `.env` structure (Supabase URL, Service Key, JWT Secret).
    - [x] Create `src/config/supabase.ts` to initialize Supabase Admin client.
- [x] **Server Hardening**:
    - [x] Add Helmet/Security headers to `src/index.ts`.
    - [x] Configure global error handling middleware.

## 2. Authentication (Priority: High)
- [x] **Auth Middleware**:
    - [x] Create `src/middleware/auth.ts`.
    - [x] Implement JWT verification using Supabase Auth helper or verify token signature.
    - [x] Extract `user_id` from token and attach to `req.user`.

## 3. Core Services Implementation
- [x] **Profile Service** (`src/services/profileService.ts`):
    - [x] Logic to fetch/create/update user profiles in `public.medical_profiles`.
    - [x] Handle JSONB fields (allergies, medications).
- [x] **Encounter Service** (`src/services/encounterService.ts`):
    - [x] Logic to create encounters.
    - [x] Logic to link photos to encounters.
- [x] **Storage Service** (`src/services/storageService.ts`):
    - [x] Generate Signed Upload URLs for Supabase Storage (for Encounters/Photos).
    - [x] Generate Signed Download URLs.
- [x] **Report Service** (`src/services/reportService.ts`):
    - [x] Implement PDF generation using `pdf-lib`.
    - [x] Layout: Profile summary + Encounter notes + Photos (optional).

## 4. API Routes Implementation
### 4.1 Profile Routes (`src/routes/profile.ts`)
- [x] `GET /api/v1/profile`
- [x] `POST /api/v1/profile` (Upsert)

### 4.2 Encounter Routes (`src/routes/encounters.ts`)
- [x] `POST /api/v1/encounters` (Start encounter)
- [x] `GET /api/v1/encounters/:id` (Get details)
- [x] `POST /api/v1/encounters/:id/photos` (Get upload URL)

### 4.3 Report Routes (`src/routes/reports.ts`)
- [x] `POST /api/v1/reports/:id/generate` (Trigger PDF creation)
- [x] `GET /api/v1/reports/:id` (Get download URL)

### 4.4 Provider Routes (`src/routes/providers.ts`)
- [x] `GET /api/v1/providers` (Search by lat/lng/type)

## 5. Integration
- [x] **Register Routes**: Import and use all routes in `src/index.ts`.
- [x] **Testing**: Verify all endpoints with Postman/cURL against local or dev DB.
