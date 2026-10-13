import React from 'react';
import { VitalsAreaChart } from '../VitalsAreaChart';
import { ConcentricVitalsRing } from '../ConcentricVitalsRing';
import { ClinicalBarChart } from '../ClinicalBarChart';
import { TimeSegmentControl } from '../TimeSegmentControl';
import { RhythmWaveform } from '../RhythmWaveform';

describe('Clinical Charts System', () => {
  it('exports all 5 clinical chart visualizations', () => {
    expect(VitalsAreaChart).toBeDefined();
    expect(ConcentricVitalsRing).toBeDefined();
    expect(ClinicalBarChart).toBeDefined();
    expect(TimeSegmentControl).toBeDefined();
    expect(RhythmWaveform).toBeDefined();
  });
});
