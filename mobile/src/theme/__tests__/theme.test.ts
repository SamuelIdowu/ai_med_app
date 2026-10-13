import { theme, THEME_PRESETS, activeDesignConfig } from '../index';

describe('Centralized Medical Theme Engine', () => {
  it('exposes defined theme presets with clinical reference tokens', () => {
    const warmPreset = THEME_PRESETS.clinicalWarm;
    expect(warmPreset.canvas.background).toBe('#F8F7F4');
    expect(warmPreset.canvas.surface).toBe('#FFFFFF');
    expect(warmPreset.primary.main).toBe('#1A60FF');
    expect(warmPreset.navPill.background).toBe('#111318');
  });

  it('exposes canvas, primary, navPill, status, text and chart color structures', () => {
    expect(theme.colors.canvas.background).toBeDefined();
    expect(theme.colors.canvas.surface).toBeDefined();
    expect(theme.colors.primary.main).toBeDefined();
    expect(theme.colors.navPill.background).toBeDefined();
    expect(theme.colors.status.emergency.primary).toBeDefined();
    expect(theme.colors.status.warning.primary).toBeDefined();
    expect(theme.colors.status.success.primary).toBeDefined();
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
    expect(theme.spatial.shadows.drilldownButton).toBeDefined();
  });
});
