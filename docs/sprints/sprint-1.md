# Sprint 1: Foundation & Setup (Weeks 0-2)

## Goal
Establish the technical foundation, including the repository, authentication, database schema, and initial offline content bundling.

## Deliverables
- [x] **Repo Bootstrap**: Initialized Monorepo/Structure for Mobile (Expo) and Backend (Node/Supabase).
- [x] **Auth Integration**: Supabase/Clerk authentication flow (Login/Signup screens).
- [x] **Database Schema**: PostgreSQL migration scripts for `users`, `medical_profiles`, `encounters`, etc.
- [x] **Content**: Bundled JSON file containing the first-aid steps (offline capability).

## Detailed Implementation Tasks

### 1. Foundation & Setup
- [x] **Repo Bootstrap**: Initialize React Native project and backend structure.
- [x] **Database Setup**: Run initial migrations (Reference: `docs/tech-arch.md` Section 5).

### 2. User Interface: Authentication & Onboarding
- [x] **Splash Screen**
  > Reference: `docs/ui/splash_screen`
  - [x] Implement centered logo with fade-in animation.
  - [x] Text: "First Aid. Fast. Offline. Reliable."
- [x] **Screen 1: Welcome**
  > Reference: `docs/ui/welcome_screen`
  - [x] Implement Title: "Your First Aid Companion".
  - [x] Implement "Get Started" button (Primary).
  - [x] Implement "Sign In" link.
- [x] **Screen 2: Permissions (Initial)**
  > Reference: `docs/ui/consent_&_permissions_1`, `docs/ui/consent_&_permissions_2`
  - [x] Implement Data Usage Policy text (Privacy focus).
  - [x] Implement "I Agree & Continue" flow.

### 3. Data & Content
- [x] **First Aid Content**: Bundle `first-aid-content.json` for offline use.
- [x] **Verificaton**: Ensure content loads on Home Screen (raw view).

## Acceptance Criteria
- App compiles and runs on simulator/device.
- User can sign up and log in.
- Database tables exist in Supabase.
- App can display raw/basic first aid content from local JSON.
