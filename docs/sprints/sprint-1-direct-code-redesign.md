# Sprint 1: Native UI Redesign & Atomic Component Architecture (Direct in Code)

> **Sprint Objective:** Redesign the entire AI Med App user interface directly in React Native (Expo SDK 54). Implement the reference-driven centralized design system (`mobile/src/theme/`) synthesizing the four clinical reference designs: warm off-white canvas (`#F8F7F4`), pure white cards (`#FFFFFF`) with generous 22pt radii, vibrant clinical cobalt blue (`#1A60FF`), floating dark nav pill (`#111318`), sophisticated charts without emojis or childish neons, and structured conversational AI triage cards.

---

## 1. Architectural Scope & Directory Structure

```
mobile/src/
├── theme/                                     # 🎨 Centralized Design System Engine
│   ├── tokens.json                            # JSON schema representation of tokens
│   ├── colors.ts                              # Canvas, Primary Blue, Nav Pill, Status, Chart tokens
│   ├── typography.ts                          # Strict clinical scale (metricDisplay, display, h1-h3, body, caption)
│   ├── spatial.ts                             # Spatial scale, radii (lg: 22, pill: 9999), diffusion shadows
│   └── index.ts                               # Unified `theme` export
│
├── components/
│   ├── navigation/
│   │   └── FloatingNavPill.tsx                # Floating dark capsule nav bar with active circular indicator
│   │
│   ├── ui/                                    # 🧱 Reusable Atomic Medical UI Elements
│   │   ├── MedicalCard.tsx                    # Pure white surface card with 22pt radius & soft diffusion shadow
│   │   ├── TactileButton.tsx                  # Tactile button (primary cobalt, outline, emergency, ghost)
│   │   ├── CircularDrilldownButton.tsx        # Circular action badge with arrow-up-right (↗)
│   │   ├── FilterPills.tsx                    # Horizontal scrollable category pill capsules
│   │   ├── StatCard.tsx                       # 2x2 grid vitals stat card with bold numerical metric
│   │   ├── EmergencyBanner.tsx                # Urgent alert banner with direct 911 phone dialer
│   │   ├── SymptomChip.tsx                    # Multi-select symptom toggle pills
│   │   └── CameraReticle.tsx                  # Target overlay frame for wound focus
│   │
│   ├── charts/                                # 📊 Clinical Vitals & Trend Visualizations
│   │   ├── VitalsAreaChart.tsx                # Smooth Bézier line/area curve with guideline scrubber pin
│   │   ├── ConcentricVitalsRing.tsx           # Multi-ring concentric donut / arc gauge
│   │   ├── ClinicalBarChart.tsx               # Floating rounded bars with horizontal thresholds
│   │   ├── TimeSegmentControl.tsx             # Segmented capsule selector (Hourly | Daily | Weekly | Monthly)
│   │   └── RhythmWaveform.tsx                 # ECG / soundwave pulse frequency indicator
│   │
│   └── chat/                                  # 💬 Conversational AI & Clinical Triage Cards
│       ├── ThingsYouCanDoCards.tsx            # Structured action cards with icon capsules
│       ├── FloatingChatInput.tsx              # Pill-shaped chat input bar with mic and send button
│       └── VoiceWaveformModal.tsx             # Voice transcript modal with active audio visualizer
│
└── screens/                                   # 📱 Redesigned Application Screens
    ├── HomeScreen.tsx                         # Clinical dashboard with vitals stats, charts & quick triage
    ├── AIChatScreen.tsx                       # Conversational AI triage with structured action cards
    ├── WoundScannerScreen.tsx                 # Medical camera capture with real-time feedback
    └── MedicalProfileScreen.tsx               # Offline Medical ID card with emergency contacts
```

---

## 2. Tasks & Detailed Implementation Steps

### Task 1.1: Native Medical Theme Engine & Design Tokens

**Files:**
- Modify: `mobile/src/theme/tokens.json`
- Modify: `mobile/src/theme/colors.ts`
- Modify: `mobile/src/theme/typography.ts`
- Modify: `mobile/src/theme/spatial.ts`
- Modify: `mobile/src/theme/index.ts`
- Test: `mobile/src/theme/__tests__/theme.test.ts`

**Interfaces:**
- Produces: `theme` object providing `colors`, `typography`, `spatial` (`spacing`, `radii`, `shadows`).

- [x] **Step 1: Write failing theme unit test**

```typescript
// mobile/src/theme/__tests__/theme.test.ts
import { theme } from '../index';

describe('Centralized Medical Theme Engine', () => {
  it('exposes warm off-white canvas, white surfaces and clinical cobalt blue', () => {
    expect(theme.colors.canvas.background).toBe('#F8F7F4');
    expect(theme.colors.canvas.surface).toBe('#FFFFFF');
    expect(theme.colors.primary.main).toBe('#1A60FF');
    expect(theme.colors.navPill.background).toBe('#111318');
  });

  it('exposes clinical triage status colors conforming to WCAG AAA', () => {
    expect(theme.colors.status.emergency.primary).toBe('#EF4444');
    expect(theme.colors.status.warning.primary).toBe('#D97706');
    expect(theme.colors.status.success.primary).toBe('#10B981');
  });

  it('provides structured typography scale with metricDisplay for vital numbers', () => {
    expect(theme.typography.metricDisplay.fontSize).toBe(36);
    expect(theme.typography.metricDisplay.fontWeight).toBe('800');
    expect(theme.typography.display.fontSize).toBe(28);
    expect(theme.typography.body.fontSize).toBe(15);
  });

  it('exposes generous 22pt card radius and pill radii', () => {
    expect(theme.spatial.radii.lg).toBe(22);
    expect(theme.spatial.radii.pill).toBe(9999);
  });

  it('provides soft diffusion shadow presets', () => {
    expect(theme.spatial.shadows.card).toBeDefined();
    expect(theme.spatial.shadows.floatingPill).toBeDefined();
  });
});
```

- [x] **Step 2: Run test to verify failure**

Run: `npm --prefix mobile test src/theme/__tests__/theme.test.ts`
Expected: FAIL

- [x] **Step 3: Implement `mobile/src/theme/colors.ts`**

```typescript
// mobile/src/theme/colors.ts
export const colors = {
  // 1. Canvas & Surfaces (Warm Off-White & Pure White Card Layers)
  canvas: {
    background: '#F8F7F4',     // Warm clinical off-white canvas
    surface: '#FFFFFF',        // Pure white card surfaces
    surfaceSubtle: '#F2EFE9',  // Subtle recessed background (pills, search inputs)
    border: '#EAE6DF',         // Soft tactile card borders
    borderFocus: '#1A60FF',    // Active border focus
  },

  // 2. Primary Brand (Cobalt Blue from ref 2)
  primary: {
    main: '#1A60FF',           // Vibrant medical electric cobalt
    hover: '#0D50E6',          // Pressed state
    light: '#EBF2FF',          // Subtle tinted chip/badge surface
    border: '#BFD7FE',         // Subtle blue borders
  },

  // 3. Navigation Dark Pill (Floating bottom pill from reference.webp)
  navPill: {
    background: '#111318',     // Deep charcoal / onyx floating pill
    border: 'rgba(255,255,255,0.08)',
    activeIndicator: '#1A60FF',// Circular active tab highlight
    activeIcon: '#FFFFFF',
    inactiveIcon: '#717886',   // Muted slate icon
    shadow: 'rgba(0, 0, 0, 0.28)',
  },

  // 4. Clinical Triage States (Strict WCAG AAA)
  status: {
    emergency: {
      primary: '#EF4444',      // Urgent red
      surface: '#FEF2F2',
      border: '#FCA5A5',
      text: '#991B1B',
    },
    warning: {
      primary: '#D97706',      // Clinical amber
      surface: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
    },
    success: {
      primary: '#10B981',      // Clinical emerald
      surface: '#ECFDF5',
      border: '#A7F3D0',
      text: '#065F46',
    },
    info: {
      primary: '#1A60FF',
      surface: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1E40AF',
    },
  },

  // 5. Typography & High-Contrast Neutrals
  text: {
    primary: '#0F172A',        // Onyx high legibility
    secondary: '#475569',      // Slate mid-tone
    muted: '#94A3B8',          // Light slate captions
    inverse: '#FFFFFF',        // Pure white for dark pill / primary buttons
  },

  // 6. Clinical Charts
  chart: {
    linePrimary: '#1A60FF',
    lineGradientStart: 'rgba(26, 96, 255, 0.20)',
    lineGradientEnd: 'rgba(26, 96, 255, 0.00)',
    donutRingOuter: '#1A60FF',
    donutRingMiddle: '#60A5FA',
    donutRingInner: '#CBD5E1',
    barNormal: '#1A60FF',
    barElevated: '#EF4444',
    barMuted: '#E2E8F0',
    gridLine: '#F1F5F9',
  },
} as const;

export type AppColors = typeof colors;
```

- [x] **Step 4: Implement `mobile/src/theme/typography.ts` and `spatial.ts`**

```typescript
// mobile/src/theme/typography.ts
import { TextStyle } from 'react-native';

export const typography = {
  metricDisplay: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
    letterSpacing: -1.0,
  } as TextStyle,
  display: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.6,
  } as TextStyle,
  h1: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.4,
  } as TextStyle,
  h2: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
  } as TextStyle,
  h3: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,
  bodyBold: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0.1,
  } as TextStyle,
  micro: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.4,
  } as TextStyle,
} as const;

export type AppTypography = typeof typography;

// mobile/src/theme/spatial.ts
export const spatial = {
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radii: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,      // Standard Medical Cards
    xl: 28,      // Large Modal / Action Cards
    pill: 9999,  // Filter Chips, Floating Nav Pill, Buttons
  },
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    floatingPill: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 16,
      elevation: 8,
    },
    drilldownButton: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
  },
  touchMinTarget: 48,
} as const;

export type AppSpatial = typeof spatial;

// mobile/src/theme/index.ts
export * from './colors';
export * from './typography';
export * from './spatial';

import { colors } from './colors';
import { typography } from './typography';
import { spatial } from './spatial';

export const theme = {
  colors,
  typography,
  spatial,
} as const;

export default theme;
```

---

### Task 1.2: Atomic Medical UI Elements & Floating Nav Pill

**Files:**
- Create: `mobile/src/components/navigation/FloatingNavPill.tsx`
- Create: `mobile/src/components/ui/MedicalCard.tsx`
- Create: `mobile/src/components/ui/TactileButton.tsx`
- Create: `mobile/src/components/ui/CircularDrilldownButton.tsx`
- Create: `mobile/src/components/ui/FilterPills.tsx`
- Create: `mobile/src/components/ui/StatCard.tsx`
- Create: `mobile/src/components/ui/EmergencyBanner.tsx`
- Create: `mobile/src/components/ui/SymptomChip.tsx`
- Test: `mobile/src/components/ui/__tests__/atoms.test.tsx`

**Key Specifications:**
1. `FloatingNavPill.tsx`: Deep charcoal capsule (`#111318`), elevated with shadow (`shadowRadius: 16`), active tab highlighted by cobalt circular indicator (`#1A60FF`).
2. `MedicalCard.tsx`: Pure white surface (`#FFFFFF`), `borderRadius: 22`, border `1px solid #EAE6DF`.
3. `CircularDrilldownButton.tsx`: Circular badge button (`w-9 h-9`, `borderRadius: 18`) with `↗` arrow icon.
4. `FilterPills.tsx`: Horizontal scrollable capsules (`borderRadius: 9999`) for category switching.
5. `StatCard.tsx`: 2x2 grid vitals stat card with large numerical metric (`metricDisplay`), unit subtitle, and status pill.

---

### Task 1.3: Clinical Charts System (No childish emojis or candy neons)

**Files:**
- Create: `mobile/src/components/charts/VitalsAreaChart.tsx`
- Create: `mobile/src/components/charts/ConcentricVitalsRing.tsx`
- Create: `mobile/src/components/charts/ClinicalBarChart.tsx`
- Create: `mobile/src/components/charts/TimeSegmentControl.tsx`
- Create: `mobile/src/components/charts/RhythmWaveform.tsx`
- Test: `mobile/src/components/charts/__tests__/charts.test.tsx`

**Key Specifications:**
1. `VitalsAreaChart.tsx`: Smooth Bézier line in `#1A60FF` with downward gradient fade, interactive scrubber pin showing floating numerical badge (e.g. `78 BPM`).
2. `ConcentricVitalsRing.tsx`: Multi-concentric donut rings / single-arc gauge with clinical legends.
3. `ClinicalBarChart.tsx`: Floating rounded pill bars with horizontal dashed threshold guides.
4. `TimeSegmentControl.tsx`: Segmented capsule control (`Hourly | Daily | Weekly | Monthly`).
5. `RhythmWaveform.tsx`: Audio/ECG pulse bar frequency display for cardiac rate & recording states.

---

### Task 1.4: Conversational AI Triage & Action Cards

**Files:**
- Create: `mobile/src/components/chat/ThingsYouCanDoCards.tsx`
- Create: `mobile/src/components/chat/FloatingChatInput.tsx`
- Create: `mobile/src/components/chat/VoiceWaveformModal.tsx`
- Test: `mobile/src/components/chat/__tests__/chatUi.test.tsx`

**Key Specifications:**
1. `ThingsYouCanDoCards.tsx`: High-tactile white cards with left icon capsules (Calendar, Medication Clock, Checklist) offering 1-tap quick actions.
2. `FloatingChatInput.tsx`: Floating pill input capsule ("Ask anything about your health?") with microphone and send icons.
3. `VoiceWaveformModal.tsx`: Voice recording modal with live soundwave frequency visualizer and pause/stop controls.

---

### Task 1.5: Screen Redesigns & Full Application Assembly

**Files:**
- Redesign: `mobile/src/screens/HomeScreen.tsx`
- Redesign: `mobile/src/screens/AIChatScreen.tsx`
- Redesign: `mobile/src/screens/MedicalProfileScreen.tsx`
- Redesign: `mobile/src/screens/WoundScannerScreen.tsx`
- Update: `mobile/src/navigation/AppNavigator.tsx` & `mobile/src/components/BottomTabBar.tsx`

---

## 3. Verification & Acceptance Criteria
- Canvas is warm clinical off-white (`#F8F7F4`), not dark or stark white.
- Cards are pure white (`#FFFFFF`) with generous `22pt` corner radii and soft diffusion shadows.
- Primary accent is vibrant clinical cobalt blue (`#1A60FF`).
- Floating dark nav pill (`#111318`) floats above home indicator with circular active bubble.
- All charts render cleanly without emojis or childish neon colors.
- AI chat interface incorporates "Things you can do" action cards and floating pill input.

---

## 4. Sprint 1 Implementation Checklist

- [x] **Task 1.1: Native Medical Theme Engine & Design Tokens**
  - [x] Implement `tokens.json` schema definitions
  - [x] Implement `colors.ts` with canvas, primary cobalt, status, and nav pill tokens
  - [x] Implement `typography.ts` with clinical type scale (`display`, `metricDisplay`, `h1`-`h3`, `body`, `caption`)
  - [x] Implement `spatial.ts` with spacing, radii (`lg: 22`, `pill: 9999`), and diffusion shadows
  - [x] Export unified `theme` in `mobile/src/theme/index.ts`
  - [x] Verify `theme.test.ts` passes

- [x] **Task 1.2: Reusable Tactile UI Atoms**
  - [x] Build `MedicalCard.tsx` (pure white surface, 22pt radius, diffusion shadow)
  - [x] Build `TactileButton.tsx` (primary cobalt, outline, emergency, ghost states)
  - [x] Build `CircularDrilldownButton.tsx` (circular badge with arrow-up-right `↗`)
  - [x] Build `FilterPills.tsx` (horizontal category pill capsules)
  - [x] Build `StatCard.tsx` (2x2 grid vitals stat card with bold numerical metric)
  - [x] Build `EmergencyBanner.tsx` (urgent triage alert banner with 911 dialer)
  - [x] Build `SymptomChip.tsx` (multi-select symptom toggle pills)
  - [x] Build `CameraReticle.tsx` (camera overlay frame for wound focus)
  - [x] Verify atomic UI components unit tests pass

- [x] **Task 1.3: Clinical Data Visualizations & Charts**
  - [x] Build `VitalsAreaChart.tsx` (Bézier curve, gradient fill, interactive scrubber pin)
  - [x] Build `ConcentricVitalsRing.tsx` (multi-ring concentric gauge)
  - [x] Build `ClinicalBarChart.tsx` (floating rounded bars with threshold guides)
  - [x] Build `TimeSegmentControl.tsx` (segmented capsule: Hourly | Daily | Weekly | Monthly)
  - [x] Build `RhythmWaveform.tsx` (cardiac / audio pulse frequency visualizer)
  - [x] Verify chart components render and test suite passes

- [x] **Task 1.4: Conversational AI Triage & Action Cards**
  - [x] Build `ThingsYouCanDoCards.tsx` (1-tap quick action cards with icon capsules)
  - [x] Build `FloatingChatInput.tsx` (floating pill input with mic and send controls)
  - [x] Build `VoiceWaveformModal.tsx` (voice recording modal with live frequency waveform)
  - [x] Verify chat UI components test suite passes

- [x] **Task 1.5: Screen Redesigns & Application Assembly**
  - [x] Redesign `HomeScreen.tsx` (vitals stats, minimal emergency grid, search, filters)
  - [x] Redesign `AIChatScreen.tsx` (conversational AI triage with structured cards)
  - [x] Redesign `MedicalProfileScreen.tsx` (offline Medical ID with emergency contacts)
  - [x] Build `WoundScannerScreen.tsx` (camera capture with reticle & instant feedback)
  - [x] Integrate `FloatingNavPill.tsx` with dedicated 911 emergency button in navigation


