import React from 'react';
import { MedicalCard } from '../MedicalCard';
import { TactileButton } from '../TactileButton';
import { CircularDrilldownButton } from '../CircularDrilldownButton';
import { FilterPills } from '../FilterPills';
import { StatCard } from '../StatCard';
import { EmergencyBanner } from '../EmergencyBanner';
import { SymptomChip } from '../SymptomChip';
import { CameraReticle } from '../CameraReticle';

describe('Atomic Medical UI Elements', () => {
  it('exports all 8 atomic components', () => {
    expect(MedicalCard).toBeDefined();
    expect(TactileButton).toBeDefined();
    expect(CircularDrilldownButton).toBeDefined();
    expect(FilterPills).toBeDefined();
    expect(StatCard).toBeDefined();
    expect(EmergencyBanner).toBeDefined();
    expect(SymptomChip).toBeDefined();
    expect(CameraReticle).toBeDefined();
  });
});
