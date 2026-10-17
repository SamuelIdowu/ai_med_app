import { ILLUSTRATIONS, getIllustration, IllustrationKey } from '../illustrations';

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

  it('provides metadata including title, screen target, and description', () => {
    const emblem = ILLUSTRATIONS.splashEmblem;
    expect(emblem.key).toBe('splashEmblem');
    expect(emblem.screen).toBe('SplashScreen');
    expect(emblem.source).toBeDefined();
  });
});
