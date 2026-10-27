# 3D Illustrations & Organic Animated Sphere Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire all 10 generated 3D medical illustrations from `mobile/assets/illustrations/` into their designated mobile screens, implement a high-performance 60fps `OrganicFluidSphere` component with acoustic ripple halos and fluid squish/stretch for voice recording in `VoiceWaveformModal` and `AIChatScreen`, and establish a centralized typed asset loader with graceful fallbacks.

**Architecture:** 
- Centralized asset registry in `mobile/src/assets/illustrations.ts` providing typed `require()` handles and graceful fallbacks.
- Modular `OrganicFluidSphere` component using React Native's native-driven `Animated` API with squish-and-stretch geometry, counter-rotating linear gradients, and radiating acoustic halos.
- Progressive enhancement across target screens with 3D tactile elevation (`shadows3d.card3d` / `floating3d`) and frosted glassmorphism overlays.

**Tech Stack:** React Native 0.81.5, Expo 54, `expo-linear-gradient`, React Native `Animated` (`useNativeDriver: true`), Jest, TypeScript 5.9.

---

### Task 1: Create Centralized 3D Illustration Asset Registry

**Files:**
- Create: `mobile/src/assets/illustrations.ts`
- Test: `mobile/src/assets/__tests__/illustrations.test.ts`

**Step 1: Write the failing test**
Create `mobile/src/assets/__tests__/illustrations.test.ts` asserting that all 10 generated illustrations and placeholder fallbacks are properly exported and resolvable.

```typescript
import { ILLUSTRATIONS, getIllustration } from '../illustrations';

describe('3D Illustrations Registry', () => {
  it('exports all 10 primary illustration assets and definitions', () => {
    expect(ILLUSTRATIONS.splashEmblem).toBeDefined();
    expect(ILLUSTRATIONS.welcomeShield).toBeDefined();
    expect(ILLUSTRATIONS.heartVitals).toBeDefined();
    expect(ILLUSTRATIONS.firstAidKit).toBeDefined();
    expect(ILLUSTRATIONS.emergencyBeacon).toBeDefined();
    expect(ILLUSTRATIONS.cprGuide).toBeDefined();
    expect(ILLUSTRATIONS.achievementBadge).toBeDefined();
    expect(ILLUSTRATIONS.visionScanner).toBeDefined();
    expect(ILLUSTRATIONS.recordCapsule).toBeDefined();
    expect(ILLUSTRATIONS.hospitalLocator).toBeDefined();
  });

  it('provides safe fallbacks for pending illustrations', () => {
    expect(getIllustration('neuralOrb')).toBeNull();
    expect(getIllustration('diagnosticMolecule')).toBeNull();
    expect(getIllustration('splashEmblem')).not.toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**
Run: `cd backend && npm run test:mobile -- illustrations.test.ts`
Expected: FAIL with "Cannot find module '../illustrations'"

**Step 3: Implement `mobile/src/assets/illustrations.ts`**
Provide strongly typed references to all 10 images in `mobile/assets/illustrations/` with helper methods.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm run test:mobile -- illustrations.test.ts`
Expected: PASS (2 tests passed)

**Step 5: Commit**
```bash
git add mobile/src/assets/
git commit -m "feat(mobile): add centralized 3D illustration asset registry with typed fallbacks"
```

---

### Task 2: Build `OrganicFluidSphere` Component for Recording & AI State

**Files:**
- Create: `mobile/src/components/ui/OrganicFluidSphere.tsx`
- Test: `mobile/src/components/ui/__tests__/OrganicFluidSphere.test.tsx`

**Step 1: Write the failing test**
Create `mobile/src/components/ui/__tests__/OrganicFluidSphere.test.tsx` verifying:
- Renders with `idle`, `recording`, and `thinking` states.
- Renders concentric ripple halos and gradient layers.
- Supports custom size and optional inner image overlay.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm run test:mobile -- OrganicFluidSphere.test.tsx`
Expected: FAIL with "Cannot find module"

**Step 3: Implement `OrganicFluidSphere.tsx`**
- Non-uniform squish-and-stretch: `scaleX` and `scaleY` phase-shifted looping with native driver.
- 2 acoustic halo rings expanding from `scale: 1.0 -> 1.75` with decaying opacity (`0.5 -> 0.0`).
- Swirling gradient layers using palette colors (`coralCoast`, `eliteTeal`, `blissfulBlue`).
- Floating specular reflection drift.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm run test:mobile -- OrganicFluidSphere.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add mobile/src/components/ui/OrganicFluidSphere.tsx mobile/src/components/ui/__tests__/OrganicFluidSphere.test.tsx
git commit -m "feat(mobile): implement OrganicFluidSphere with acoustic halo ripples and fluid motion"
```

---

### Task 3: Integrate `OrganicFluidSphere` into Voice Modal & AI Chat Screen

**Files:**
- Modify: `mobile/src/components/chat/VoiceWaveformModal.tsx`
- Modify: `mobile/src/screens/AIChatScreen.tsx`
- Test: `mobile/src/components/chat/__tests__/chatUi.test.tsx`

**Step 1: Update `VoiceWaveformModal.tsx`**
Replace the static `pulseAnim` view with `<OrganicFluidSphere state={isAgentSpeaking ? 'thinking' : 'recording'} size={ORB_SIZE} />`.

**Step 2: Update `AIChatScreen.tsx`**
Replace the placeholder welcome gradient with `<OrganicFluidSphere state="idle" size={140} />` in the empty chat state.

**Step 3: Run mobile test suite**
Run: `cd backend && npm run test:mobile`
Expected: PASS

**Step 4: Commit**
```bash
git add mobile/src/components/chat/VoiceWaveformModal.tsx mobile/src/screens/AIChatScreen.tsx
git commit -m "feat(chat): wire OrganicFluidSphere into voice recording modal and empty state hero"
```

---

### Task 4: Integrate 3D Illustrations into Onboarding & Auth Screens

**Files:**
- Modify: `mobile/src/screens/SplashScreen.tsx` (embed `splashEmblem`)
- Modify: `mobile/src/screens/WelcomeScreen.tsx` (embed `welcomeShield`)

**Step 1: Update `SplashScreen.tsx`**
Add 3D Laso+ Emblem (`ILLUSTRATIONS.splashEmblem`) above the brand title with subtle 3D elevation and floating fade-in.

**Step 2: Update `WelcomeScreen.tsx`**
Embed `ILLUSTRATIONS.welcomeShield` into the hero container with frosted glassmorphism framing.

**Step 3: Verify TypeScript & Jest**
Run: `cd mobile && npx tsc --noEmit`
Run: `cd backend && npm run test:mobile`
Expected: 0 TS errors, all tests pass.

**Step 4: Commit**
```bash
git add mobile/src/screens/SplashScreen.tsx mobile/src/screens/WelcomeScreen.tsx
git commit -m "feat(ui): add 3D splash emblem and welcome shield illustrations"
```

---

### Task 5: Integrate 3D Illustrations into Dashboard & Emergency Screens

**Files:**
- Modify: `mobile/src/screens/HomeScreen.tsx` (embed `heartVitals` & `firstAidKit`)
- Modify: `mobile/src/screens/LiveTriageScreen.tsx` (embed `emergencyBeacon`)
- Modify: `mobile/src/screens/EmergencyStepScreen.tsx` (embed `cprGuide`)
- Modify: `mobile/src/screens/EmergencySummaryScreen.tsx` (embed `achievementBadge`)

**Step 1: Update `HomeScreen.tsx`**
Add 3D Heart Biometric Orb into the Vitals Hero banner and First-Aid Kit 3D asset into the emergency quick-action card.

**Step 2: Update `LiveTriageScreen.tsx`**
Add 3D Emergency Siren Beacon into the top critical alert banner with red radiant glow.

**Step 3: Update `EmergencyStepScreen.tsx` & `EmergencySummaryScreen.tsx`**
- Embed 3D CPR Anatomical Guide into CPR/compression step flows.
- Embed 3D Medical Achievement Badge into `EmergencySummaryScreen` hero section.

**Step 4: Verify TypeScript & Jest**
Run: `cd mobile && npx tsc --noEmit`
Run: `cd backend && npm run test:mobile`
Expected: PASS

**Step 5: Commit**
```bash
git add mobile/src/screens/HomeScreen.tsx mobile/src/screens/LiveTriageScreen.tsx mobile/src/screens/EmergencyStepScreen.tsx mobile/src/screens/EmergencySummaryScreen.tsx
git commit -m "feat(ui): integrate 3D illustrations into home, live triage, and emergency workflows"
```

---

### Task 6: Integrate 3D Illustrations into Vision Scanner, Reports & Directory

**Files:**
- Modify: `mobile/src/screens/WoundScannerScreen.tsx` (embed `visionScanner`)
- Modify: `mobile/src/screens/ReportPreviewScreen.tsx` (embed `recordCapsule`)
- Modify: `mobile/src/screens/ProviderListScreen.tsx` & `ProviderListScreen.web.tsx` (embed `hospitalLocator`)

**Step 1: Update `WoundScannerScreen.tsx`**
Embed `ILLUSTRATIONS.visionScanner` into the empty/guidance scanner card with subtle glassmorphic overlay.

**Step 2: Update `ReportPreviewScreen.tsx`**
Embed `ILLUSTRATIONS.recordCapsule` at the top of the report preview header.

**Step 3: Update `ProviderListScreen.tsx` & `.web.tsx`**
Embed `ILLUSTRATIONS.hospitalLocator` in the empty clinic search state and directory header.

**Step 4: Verify TypeScript & Jest**
Run: `cd mobile && npx tsc --noEmit`
Run: `cd backend && npm run test:mobile`
Expected: 0 errors, all 8 test suites pass.

**Step 5: Commit**
```bash
git add mobile/src/screens/WoundScannerScreen.tsx mobile/src/screens/ReportPreviewScreen.tsx mobile/src/screens/ProviderListScreen.tsx mobile/src/screens/ProviderListScreen.web.tsx
git commit -m "feat(ui): integrate 3D illustrations into wound scanner, reports, and provider directory"
```

---

### Task 7: Full Regression Verification & Documentation Update

**Files:**
- Modify: `walkthrough.md`

**Step 1: Full TypeScript Verification**
Run: `cd mobile && npx tsc --noEmit`
Expected: 0 errors

**Step 2: Full Mobile Jest Test Suite**
Run: `cd backend && npm run test:mobile`
Expected: 8/8 test suites pass, 50+ tests pass

**Step 3: Update `walkthrough.md` Artifact**
Document the completed asset integration, the `OrganicFluidSphere` architecture, and all screen updates.

**Step 4: Commit**
```bash
git add walkthrough.md
git commit -m "docs: document 3D illustrations integration and animated organic sphere"
```
