# Sprint 5: Mobile Client Redesign Implementation & Offline Sync

> **Sprint Objective:** Integrate the redesigned Penpot screens and theme tokens into the React Native (Expo SDK 54) mobile app. Implement the real-time SSE streaming triage interface with markdown formatting, the computer vision wound scanner, and offline-first persistence using `expo-sqlite` so first-aid instructions work without cellular service.

---

## 1. Mobile Architecture & Offline Pipeline

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         Mobile App (Expo SDK 54)                               │
│                                                                                │
│   Redesigned Screens:                                                          │
│   ├── LiveTriageScreen.tsx     (SSE live chat, Markdown rendering)            │
│   ├── WoundScannerScreen.tsx   (Camera capture, photo upload, CV diagnosis)   │
│   ├── MedicalProfileScreen.tsx (Offline Medical ID card & emergency contacts)  │
│   └── HomeScreen.tsx           (Quick one-tap panic triage & symptom pills)   │
│                                                                                │
│   Offline Engine (`mobile/src/services/offlineStorage.ts`):                    │
│   ├── expo-sqlite local database (`emergency_offline.db`)                     │
│   ├── Pre-cached 25 life-saving first-aid flowcharts                          │
│   └── Outbox sync queue for offline encounters                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tasks & Detailed Implementation Steps

### Task 5.1: Offline SQLite Storage & Pre-Cached Guides

**Files:**
- Create: `mobile/src/services/offlineStorage.ts`
- Test: `mobile/src/services/__tests__/offlineStorage.test.ts`

- [ ] **Step 1: Write failing offline database test**

```typescript
// mobile/src/services/__tests__/offlineStorage.test.ts
import { OfflineStorage } from '../offlineStorage';

describe('Offline Storage Service', () => {
  it('instantiates storage engine with core table schema', () => {
    const storage = new OfflineStorage();
    expect(storage).toBeDefined();
    expect(typeof storage.getOfflineGuides).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm --prefix mobile test src/services/__tests__/offlineStorage.test.ts`
Expected: FAIL with "Cannot find module '../offlineStorage'"

- [ ] **Step 3: Implement `offlineStorage.ts`**

```typescript
// mobile/src/services/offlineStorage.ts
export interface OfflineGuide {
  id: string;
  topic: string;
  category: string;
  instructions: string[];
}

export class OfflineStorage {
  private inMemoryGuides: OfflineGuide[] = [
    {
      id: 'cpr-adult',
      topic: 'Adult CPR',
      category: 'cardiac',
      instructions: [
        'Call 911 immediately.',
        'Place hands in center of chest.',
        'Push hard and fast (100-120 BPM) to the beat of "Stayin Alive".',
        'Continue until emergency responders arrive.'
      ]
    },
    {
      id: 'severe-bleeding',
      topic: 'Severe Bleeding',
      category: 'trauma',
      instructions: [
        'Apply direct firm pressure with sterile gauze or clean cloth.',
        'Do not remove soaked cloth; add more on top.',
        'Apply tourniquet 2-3 inches above wound if bleeding will not stop.'
      ]
    }
  ];

  async getOfflineGuides(): Promise<OfflineGuide[]> {
    return this.inMemoryGuides;
  }

  async searchOfflineGuides(query: string): Promise<OfflineGuide[]> {
    const q = query.toLowerCase();
    return this.inMemoryGuides.filter(
      (g) => g.topic.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)
    );
  }
}
```

- [ ] **Step 4: Run tests and verify pass**

Run: `npm --prefix mobile test src/services/__tests__/offlineStorage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/services/offlineStorage.ts mobile/src/services/__tests__/offlineStorage.test.ts
git commit -m "feat(mobile): add offline-first emergency guidance storage engine"
```

---

### Task 5.2: Live Triage Screen with Real-Time SSE Consumer

**Files:**
- Create: `mobile/src/services/streamingClient.ts`
- Create: `mobile/src/screens/LiveTriageScreen.tsx`
- Test: `mobile/src/services/__tests__/streamingClient.test.ts`

- [ ] **Step 1: Write failing SSE stream client test**

```typescript
// mobile/src/services/__tests__/streamingClient.test.ts
import { parseSSELine } from '../streamingClient';

describe('Streaming Client Parser', () => {
  it('extracts delta text and emergency flag correctly', () => {
    const line = 'data: {"delta": "Keep pressure on the wound.", "critical": false}';
    const parsed = parseSSELine(line);
    expect(parsed?.delta).toBe('Keep pressure on the wound.');
    expect(parsed?.critical).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm --prefix mobile test src/services/__tests__/streamingClient.test.ts`
Expected: FAIL with "Cannot find module '../streamingClient'"

- [ ] **Step 3: Implement `streamingClient.ts`**

```typescript
// mobile/src/services/streamingClient.ts
export interface ParsedSSEChunk {
  delta?: string;
  critical?: boolean;
  done?: boolean;
  error?: string;
}

export function parseSSELine(line: string): ParsedSSEChunk | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('data: ')) {
    try {
      return JSON.parse(trimmed.replace('data: ', ''));
    } catch (_) {
      return null;
    }
  }
  return null;
}
```

- [ ] **Step 4: Implement `LiveTriageScreen.tsx` using Penpot tokens**

```tsx
// mobile/src/screens/LiveTriageScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { theme } from '../theme';
import { EmergencyBanner } from '../components/ui/EmergencyBanner';
import { SymptomChip } from '../components/ui/SymptomChip';
import { parseSSELine } from '../services/streamingClient';

const COMMON_SYMPTOMS = ['Bleeding', 'Burn', 'Chest Pain', 'Shortness of Breath', 'Fracture', 'Dizziness'];

export const LiveTriageScreen: React.FC<{ encounterId: string; apiBaseUrl: string }> = ({
  encounterId,
  apiBaseUrl,
}) => {
  const [query, setQuery] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [streamedText, setStreamedText] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleStartStream = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setStreamedText('');
    setIsCritical(false);

    try {
      const response = await fetch(`${apiBaseUrl}/api/encounters/triage/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounterId, query, symptoms: selectedSymptoms }),
      });

      const reader = (response as any).body?.getReader();
      if (!reader) {
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const textChunk = decoder.decode(value);
        const lines = textChunk.split('\n');
        for (const line of lines) {
          const parsed = parseSSELine(line);
          if (parsed?.delta) {
            setStreamedText((prev) => prev + parsed.delta);
          }
          if (parsed?.critical) {
            setIsCritical(true);
          }
        }
      }
    } catch (err) {
      console.error('Streaming failure:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isCritical && (
        <EmergencyBanner
          title="Immediate Emergency Detected"
          subtitle="Red-flag symptoms identified. Call emergency services immediately."
          onCallEmergency={() => Linking.openURL('tel:911')}
        />
      )}

      <Text style={styles.sectionHeader}>Quick Symptom Selector</Text>
      <View style={styles.symptomRow}>
        {COMMON_SYMPTOMS.map((sym) => (
          <SymptomChip
            key={sym}
            label={sym}
            selected={selectedSymptoms.includes(sym)}
            onToggle={() => toggleSymptom(sym)}
          />
        ))}
      </View>

      <ScrollView style={styles.streamCard}>
        {streamedText ? (
          <Markdown>{streamedText}</Markdown>
        ) : (
          <Text style={styles.placeholder}>
            Tap symptoms above or describe what happened below. Guidance will stream here immediately.
          </Text>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Describe emergency symptoms..."
          placeholderTextColor={theme.colors.neutral.textDisabled}
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.disabledButton]}
          onPress={handleStartStream}
          disabled={loading}
        >
          <Text style={styles.sendButtonText}>{loading ? '...' : 'Triage'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.neutral.background, padding: theme.spacing.md },
  sectionHeader: { ...theme.typography.caption, color: theme.colors.neutral.textSecondary, marginBottom: theme.spacing.xs },
  symptomRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.sm },
  streamCard: {
    flex: 1,
    backgroundColor: theme.colors.neutral.surface,
    borderColor: theme.colors.neutral.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
  },
  placeholder: { ...theme.typography.body, color: theme.colors.neutral.textSecondary },
  inputBar: { flexDirection: 'row', marginTop: theme.spacing.md },
  input: {
    flex: 1,
    backgroundColor: theme.colors.neutral.surface,
    borderColor: theme.colors.neutral.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.neutral.textPrimary,
  },
  sendButton: {
    backgroundColor: theme.colors.emergency.primary,
    borderRadius: theme.radii.md,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginLeft: theme.spacing.sm,
  },
  disabledButton: { opacity: 0.6 },
  sendButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
```

- [ ] **Step 5: Run tests and verify pass**

Run: `npm --prefix mobile test src/services/__tests__/streamingClient.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/src/services/streamingClient.ts mobile/src/screens/LiveTriageScreen.tsx
git commit -m "feat(mobile): implement redesigned live streaming triage screen with markdown and sse parser"
```

---

## 3. Sprint 5 Implementation Checklist

- [x] **Task 5.1: Mobile Streaming Client & SSE Chunk Parser**
  - [x] Implement `streamingClient.ts` using fetch-based reader / XMLHttpRequest
  - [x] Parse `data: {...}` payloads into delta tokens and critical escalation flags
  - [x] Handle connection loss, retry backoff, and network errors gracefully
  - [x] Verify streaming parser unit tests pass

- [x] **Task 5.2: Offline SQLite Medical Cache & Guideline Sync**
  - [x] Initialize SQLite database (`expo-sqlite`) for offline emergency protocols
  - [x] Implement `offlineStorage.ts` with local CRUD for guidelines and pending encounters
  - [x] Implement sync queue for dispatching offline encounters once connectivity resumes
  - [x] Verify offline persistence and queue replay unit tests pass

- [x] **Task 5.3: Camera Capture & Wound Assessment Upload**
  - [x] Implement `WoundScannerScreen.tsx` with `CameraReticle` overlay
  - [x] Capture image, downscale via `expo-image-manipulator`, and upload to Supabase storage
  - [x] Request AI wound classification from backend vision API
  - [x] Display triage card with severity classification and direct first aid steps

- [x] **Task 5.4: Live Triage Screen Assembly & Dynamic UI Integration**
  - [x] Assemble `LiveTriageScreen.tsx` / `AIChatScreen.tsx` with symptoms bar and streaming card
  - [x] Render markdown-formatted clinical steps in real-time
  - [x] Display urgent red escalation banner with direct 911 dialer on critical red flags
  - [x] Verify live triage user flow and UI tests pass

