import { theme, THEME_PRESETS, BRAND_PALETTE } from '../index';
import appTheme, { COLORS, SHADOWS } from '../../constants/theme';

describe('Centralized Medical Theme Engine', () => {
  it('exposes defined theme presets with clinical reference tokens including coralTeal', () => {
    const coralTealPreset = THEME_PRESETS.coralTeal;
    expect(coralTealPreset.primary.main).toBe(BRAND_PALETTE.coralCoast);
    expect(coralTealPreset.navPill.background).toBe(BRAND_PALETTE.eliteTeal);
    expect(coralTealPreset.text.primary).toBe(BRAND_PALETTE.darkSideMoon);
    expect(coralTealPreset.text.secondary).toBe(BRAND_PALETTE.petroBlue);
  });

  it('exposes full brand palette swatches with high contrast', () => {
    expect(BRAND_PALETTE.coralCoast).toBe('#0e88a0');
    expect(BRAND_PALETTE.eliteTeal).toBe('#0f333a');
    expect(BRAND_PALETTE.darkSideMoon).toBe('#061011');
    expect(BRAND_PALETTE.petroBlue).toBe('#305762');
    expect(BRAND_PALETTE.pompeiiAsh).toBe('#6a787d');
    expect(BRAND_PALETTE.blissfulBlue).toBe('#b1c8d8');
  });

  it('provides vivid medical red for emergency status and appropriate triage colors', () => {
    expect(theme.colors.status.emergency.primary).toBe('#EF4444');
    expect(theme.colors.status.emergency.glow).toBe('rgba(239, 68, 68, 0.25)');
    expect(theme.colors.status.warning.primary).toBe('#F59E0B');
    expect(theme.colors.status.success.primary).toBe('#10B981');
    expect(theme.colors.status.info.primary).toBe('#0e88a0');
  });

  it('provides tactile 3D depth elevation tokens', () => {
    expect(theme.spatial.shadows3d.card3d).toBeDefined();
    expect(theme.spatial.shadows3d.card3d.elevation).toBe(4);
    expect(theme.spatial.shadows3d.floating3d).toBeDefined();
    expect(theme.spatial.shadows3d.floating3d.elevation).toBe(12);
    expect(theme.spatial.shadows3d.emergencyGlow).toBeDefined();
    expect(theme.spatial.shadows3d.emergencyGlow.shadowColor).toBe('#EF4444');
  });

  it('provides subtle glassmorphic styling tokens', () => {
    expect(theme.spatial.glassmorphism.light).toBeDefined();
    expect(theme.spatial.glassmorphism.light.borderWidth).toBe(1);
    expect(theme.spatial.glassmorphism.dark).toBeDefined();
    expect(theme.spatial.glassmorphism.emergency).toBeDefined();
  });

  it('maintains backwards compatibility for legacy constants/theme.ts import', () => {
    expect(COLORS.primary).toBe(theme.colors.primary.main);
    expect(COLORS.error).toBe(theme.colors.status.emergency.primary);
    expect(SHADOWS.card3d).toBeDefined();
    expect(appTheme.theme).toBe(theme);
  });
});

