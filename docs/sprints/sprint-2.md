# Sprint 2: Core Reporting & Privacy (Weeks 3-6)

## Goal
Build the core user-facing features: Emergency UI, Medical Profile, and Photo Capture with privacy controls.

## Deliverables
- [x] **Emergency Flow UI**: Interactive step-by-step guides for first aid.
- [x] **Medical Profile**: CRUD operations for user medical data (local & remote).
- [x] **Photo Capture**: Camera integration with local encryption/storage strategies.
- [x] **Encounter Logic**: API to create encounters and upload photo metadata.

## Detailed Implementation Tasks

### 1. Emergency Flow UI
- [x] **Home Screen Entry**
  > Reference: `docs/ui/home_screen`
  - [x] Implement "EMERGENCY" Red Button.
  - [x] Ensure distinct visibility/pulse animation.
- [x] **Category Selection**
  - [x] Implement Grid View of categories (Bleeding, Burns, CPR, etc.).
  - [x] Link icons to `first-aid-content.json` categories.
- [x] **Step-by-Step View**
  > Reference: `docs/ui/emergency_flow__step_view`
  - [x] Implement Header with Back Arrow & Emergency Type Title.
  - [x] Implement Progress Indicator ("Step X of Y").
  - [x] Implement Large Instruction Text & Illustration placeholder.
  - [x] Implement "Next Step" and "Call Emergency" buttons.
- [x] **Summary Screen**
  > Reference: `docs/ui/emergency_flow__final_step`
  - [x] proper completion message.
  - [x] "Take Photo" and "Share Report" buttons.

### 2. Medical Profile UI
- [x] **Create/Edit Profile Screen**
  > Reference: `docs/ui/create_profile`, `docs/ui/medical_profile`
  - [x] Implement Personal Info inputs (Name, Age, Blood Type).
  - [x] Implement "Allergies" chip input list.
  - [x] Implement "Medications" list.
  - [x] Implement "Emergency Contacts" section.
  - [x] Implement "Save Profile" action (Persist to Local Storage + Supabase).

### 3. Photo Capture UI
> Reference: `docs/ui/photo_capture__camera`, `docs/ui/photo_capture__instructions`, `docs/ui/photo_capture__preview_&_consent`
- [x] **Camera View**
  - [x] Implement Overlay Guides.
  - [x] Implement Capture Button.
- [x] **Preview & Consent**
  - [x] Show captured image.
  - [x] Implement "Consent to include" toggle.
  - [x] Secure file storage logic (Encryption).

## Acceptance Criteria
- User can navigate through a full first-aid scenario.
- User can save and retrieve their medical profile.
- User can take a photo and it is saved to the device/backend.
- Encounters are logged in the database.
