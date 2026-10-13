import React from 'react';
import { ThingsYouCanDoCards } from '../ThingsYouCanDoCards';
import { FloatingChatInput } from '../FloatingChatInput';
import { VoiceWaveformModal } from '../VoiceWaveformModal';

describe('Conversational AI Chat UI System', () => {
  it('exports structured triage cards, floating chat input, and voice modal', () => {
    expect(ThingsYouCanDoCards).toBeDefined();
    expect(FloatingChatInput).toBeDefined();
    expect(VoiceWaveformModal).toBeDefined();
  });
});
