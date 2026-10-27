import { ILLUSTRATIONS, getIllustration, IllustrationKey } from '../illustrations';

describe('3D Illustrations Registry', () => {
  it('exports all 12 illustration assets and definitions', () => {
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

  it('resolves every illustration to a concrete asset source', () => {
    const keys: IllustrationKey[] = Object.keys(ILLUSTRATIONS) as IllustrationKey[];
    expect(keys.length).toBe(12);
    keys.forEach((key) => {
      expect(ILLUSTRATIONS[key].source).not.toBeNull();
      expect(getIllustration(key)).not.toBeNull();
    });
  });

  it('resolves the second-generation assets', () => {
    expect(getIllustration('neuralOrb')).not.toBeNull();
    expect(getIllustration('diagnosticMolecule')).not.toBeNull();
  });

  it('provides metadata including title, screen target, and description', () => {
    const emblem = ILLUSTRATIONS.splashEmblem;
    expect(emblem.key).toBe('splashEmblem');
    expect(emblem.screen).toBe('SplashScreen');
    expect(emblem.source).toBeDefined();
  });
});
