# Walkthrough: 3D Illustrations & Animated Organic Sphere

**Branch:** `feature/centralized-ui-design-system`
**Status:** Complete — TypeScript 0 errors, 13/13 mobile test suites (61/61 tests) passing.

---

## 1. Centralized Asset Registry

**File:** `mobile/src/assets/illustrations.ts`

- Strongly-typed `ILLUSTRATIONS` dictionary maps all 12 generated renders in `mobile/assets/illustrations/` (filenames are ASCII-safe).
- `getIllustration(key)` resolves an asset to its `ImageSourcePropType`, returning `null` for any pending/missing key so every screen degrades gracefully to its original icon-based fallback.
- Registry keys: `splashEmblem`, `welcomeShield`, `heartVitals`, `firstAidKit`, `emergencyBeacon`, `cprGuide`, `achievementBadge`, `neuralOrb`, `visionScanner`, `diagnosticMolecule`, `recordCapsule`, `hospitalLocator`.
- All 12 keys now resolve to a concrete asset — the second-generation batch (`neuralOrb`, `diagnosticMolecule`) has landed and is wired.
- Covered by `mobile/src/assets/__tests__/illustrations.test.ts`.

## 2. `OrganicFluidSphere` Architecture

**File:** `mobile/src/components/ui/OrganicFluidSphere.tsx`

- 60fps React Native `Animated` component using `useNativeDriver: true`.
- **Fluid physics:** phase-shifted `scaleX`/`scaleY` oscillation produces non-uniform squish-and-stretch (not a uniform pulse).
- **Acoustic halos:** concentric rings expand `scale 1.0 → 1.75` while fading `opacity 0.5 → 0.0`, looped while active.
- **Light currents:** multi-layer gradients (`#0e88a0`, `#0f333a`, `#b1c8d8`) with a drifting specular reflection.
- **Three states:** `idle`, `recording` (listening/reactive), `thinking` (agent speaking/processing).
- Covered by `mobile/src/components/ui/__tests__/OrganicFluidSphere.test.tsx`.

## 3. Sphere Wiring

- `mobile/src/components/chat/VoiceWaveformModal.tsx` — static circle replaced with `<OrganicFluidSphere state={isAgentSpeaking ? 'thinking' : 'recording'} />`.
- `mobile/src/screens/AIChatScreen.tsx` — placeholder orb in the empty chat state replaced with `<OrganicFluidSphere state="idle" />`.

## 4. Screen Integrations

Every integration follows the same pattern: render the illustration via `getIllustration(key)` inside the existing container, with `resizeMode="contain"`, falling back to the original icon/text when the asset resolves to `null`.

| Task | Screen | Key | Placement (fallback) |
|------|--------|-----|----------------------|
| 4 | `SplashScreen.tsx` | `splashEmblem` | Icon container, 88×88 (plus-glyph text) |
| 4 | `WelcomeScreen.tsx` | `welcomeShield` | Hero illustration slot |
| 3 | `AIChatScreen.tsx` | `neuralOrb` | Model message avatar, 28×28 (`creation` icon on gradient) |
| 5 | `HomeScreen.tsx` | `firstAidKit` | Hero banner background image (`ImageBackground`, 18% opacity over Elite Teal) |
| 5 | `HomeScreen.tsx` | `heartVitals` | Vitals hero orb slot, 96×96 (heart-pulse icon) |
| 5 | `HomeScreen.tsx` | `heartVitals` | AI Emergency Triage banner icon (robot icon) |
| 5 | `LiveTriageScreen.tsx` | `emergencyBeacon` | Header title group, 36×36 (no fallback) |
| 5 | `EmergencyStepScreen.tsx` | `cprGuide` | 80×80 hero icon badge — **only for CPR categories** (`category.id === 'cpr'` or CPR-matching title); other protocols keep their category icon |
| 5 | `EmergencySummaryScreen.tsx` | `achievementBadge` | 80×80 hero check-circle badge |
| 6 | `AIAnalysisScreen.tsx` | `diagnosticMolecule` | Empty upload state icon circle, 68×68 (camera-plus icon) |
| 6 | `WoundScannerScreen.tsx` | `visionScanner` | Empty camera reticle placeholder, 140×140 (camera-plus icon) |
| 6 | `ReportPreviewScreen.tsx` | `recordCapsule` | Beside the "Emergency Report" page title, 52×52 |
| 6 | `ProviderListScreen.tsx` | `hospitalLocator` | Empty search state, 160×160 (hospital-building icon) |
| 6 | `ProviderListScreen.web.tsx` | `hospitalLocator` | Empty search state, 160×160 (hospital-building icon) |
All 12 registry keys are now wired into their designated screens.

## 5. Verification

```bash
cd mobile && npx tsc --noEmit          # 0 errors
cd backend && npm run test:mobile      # 13 suites, 61 tests, all passing
```
