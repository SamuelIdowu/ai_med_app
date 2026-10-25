import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

/**
 * Laso custom glyph set.
 *
 * A single monoline medical language: 24x24 viewBox, rounded caps/joins,
 * 1.75px default stroke. These replace the stock medical metaphors
 * (weather-windy for choking, water for bleeding, etc.) with action-led
 * symbols that are unique to Laso.
 */

export interface GlyphProps {
  size: number;
  color: string;
  strokeWidth: number;
}

const GlyphSvg: React.FC<Partial<GlyphProps> & { size: number; children: React.ReactNode }> = ({
  size,
  children,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    {children}
  </Svg>
);

const line = (color: string, strokeWidth: number) => ({
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
});

/** Emergency call: handset with a folded pulse line. */
export const EmergencyCallGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path
        d="M8.4 3.5h-2A2.4 2.4 0 0 0 4 5.9c0 9.4 6.7 16.1 16.1 16.1a2.4 2.4 0 0 0 2.4-2.4v-2a1.9 1.9 0 0 0-1.5-1.86l-2.4-.48a1.9 1.9 0 0 0-1.94.8l-.75 1.1a12.6 12.6 0 0 1-5.65-5.65l1.1-.75a1.9 1.9 0 0 0 .8-1.94l-.48-2.4A1.9 1.9 0 0 0 8.4 3.5z"
        {...s}
      />
      <Path d="M9 10.4h1.1l.7 1.5 1.3-2.8.8 1.6H14" {...s} />
    </GlyphSvg>
  );
};

/** Triage pulse: the Laso ECG line. */
export const TriagePulseGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path d="M2.5 12h3.1l1.7-4.8 3 9.4 2.2-6.4 1.5 3.4h7.5" {...s} />
    </GlyphSvg>
  );
};

/** Vision scan: corner brackets with a projected reticle. */
export const VisionScanGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path
        d="M4.5 9V6A1.5 1.5 0 0 1 6 4.5h3M15 4.5h3A1.5 1.5 0 0 1 19.5 6v3M19.5 15v3a1.5 1.5 0 0 1-1.5 1.5h-3M9 19.5H6A1.5 1.5 0 0 1 4.5 18v-3"
        {...s}
      />
      <Circle cx={12} cy={12} r={3.1} {...s} />
      <Path d="M12 7.6v1.7M12 14.7v1.7M7.6 12h1.7M14.7 12h1.7" {...s} />
    </GlyphSvg>
  );
};

/** Chat triage: speech bubble carrying a pulse. */
export const ChatTriageGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16H7.5A2.5 2.5 0 0 1 5 13.5z"
        {...s}
      />
      <Path d="M8 9.7h1.1l.8-1.6 1.3 3.4.8-1.8H14" {...s} />
    </GlyphSvg>
  );
};

/** Locate: radar pin for nearby care. */
export const LocateGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path d="M12 21c3.6-3.9 6.5-7 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 14 8.4 17.1 12 21z" {...s} />
      <Circle cx={12} cy={10.5} r={2.3} {...s} />
      <Path d="M4.2 4.2 6.3 6.3M19.8 4.2l-2.1 2.1" {...s} />
    </GlyphSvg>
  );
};

/** Fracture: bone with a break line. */
export const FractureGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Circle cx={6.2} cy={10.2} r={1.7} {...s} />
      <Circle cx={6.2} cy={14.6} r={1.7} {...s} />
      <Circle cx={17.8} cy={10.2} r={1.7} {...s} />
      <Circle cx={17.8} cy={14.6} r={1.7} {...s} />
      <Path d="M7.6 10.8 10.6 11.9M13.4 12.4 16.4 13.5" {...s} />
      <Path d="M10.9 11.8 12.1 10.6 13.6 12.9" {...s} />
    </GlyphSvg>
  );
};

/** Wound care: angled dressing with a centre pad. */
export const WoundGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path
        d="M9.8 4.6 4.6 9.8a2.6 2.6 0 0 0 0 3.7l5.9 5.9a2.6 2.6 0 0 0 3.7 0l5.2-5.2a2.6 2.6 0 0 0 0-3.7l-5.9-5.9a2.6 2.6 0 0 0-3.7 0z"
        {...s}
      />
      <Circle cx={12} cy={12} r={1.9} {...s} />
      <Circle cx={9.4} cy={12} r={0.4} {...s} />
      <Circle cx={14.6} cy={12} r={0.4} {...s} />
      <Circle cx={12} cy={9.4} r={0.4} {...s} />
      <Circle cx={12} cy={14.6} r={0.4} {...s} />
    </GlyphSvg>
  );
};

/** Burns: flame with a cooling droplet. */
export const BurnsGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path
        d="M10.7 3.4c.3 2.5 2.4 3.5 3.6 5.5a5.2 5.2 0 0 1-1.1 6.7 4.6 4.6 0 0 1-6.8-5.3c.7.7 1.4 1.1 2.3 1.2-.5-2.6 0-5.2 2-8.1z"
        {...s}
      />
      <Path d="M19 14.6c.9 1.1 1.4 1.9 1.4 2.6a1.4 1.4 0 1 1-2.8 0c0-.7.5-1.5 1.4-2.6z" {...s} />
    </GlyphSvg>
  );
};

/** Choking: airway and exhaled air. */
export const ChokingGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Circle cx={9.2} cy={7.2} r={3.4} {...s} />
      <Path d="M9.2 10.6v3.1c0 1.6-1 2.8-2.4 3.4" {...s} />
      <Path d="M14.8 6.4H19M15.4 9.2H20M14.8 12H19" {...s} />
    </GlyphSvg>
  );
};

/** Severe bleeding: droplet under pressure. */
export const BleedingGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path d="M12 3s5.5 5.6 5.5 9.2a5.5 5.5 0 1 1-11 0C6.5 8.6 12 3 12 3z" {...s} />
      <Path d="M9.5 12.2h5M12 9.7v5" {...s} />
    </GlyphSvg>
  );
};

/** CPR: heart with compression marks. */
export const CprGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path
        d="M12 20.2S4.8 15.4 4.8 10.3A3.7 3.7 0 0 1 12 8.7a3.7 3.7 0 0 1 7.2 1.6c0 5.1-7.2 9.9-7.2 9.9z"
        {...s}
      />
      <Path d="M8 3.2 9.2 5 10.4 3.2M13.6 3.2 14.8 5l1.2-1.8" {...s} />
    </GlyphSvg>
  );
};

/** Poisoning: flask with a warning mark. */
export const PoisoningGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path d="M9.5 3h5M10.5 3v5.2L5.6 17a2.2 2.2 0 0 0 1.9 3.3h9a2.2 2.2 0 0 0 1.9-3.3l-4.9-8.8V3" {...s} />
      <Path d="M12 12.8v3.4M12 18.6h.01" {...s} />
    </GlyphSvg>
  );
};

/** Allergy: auto-injector. */
export const AllergyGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Path d="M14.6 3.4l6 6M17.6 6.4 8 16l-1.5 4.5L11 19l9.6-9.6" {...s} />
      <Path d="M11.4 9.6l3 3M6.5 20.5l-2 2" {...s} />
    </GlyphSvg>
  );
};

/** Bites and stings. */
export const BitesGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Circle cx={12} cy={6.2} r={1.7} {...s} />
      <Path d="M12 8.2a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8z" {...s} />
      <Path d="M8.8 9.8 6.4 8.4M15.2 9.8l2.4-1.4M8.6 12H5.5M15.4 12h3.1M8.8 14.2l-2.4 1.4M15.2 14.2l2.4 1.4M11 4.8 10 3.2M13 4.8l1-1.6" {...s} />
    </GlyphSvg>
  );
};

/** Unconsciousness: recovery position on the ground. */
export const UnconsciousGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth }) => {
  const s = line(color, strokeWidth);
  return (
    <GlyphSvg size={size}>
      <Circle cx={7} cy={8} r={2.2} {...s} />
      <Path d="M9.4 9.5l5 .8 2.6 2.9M9.9 11.4 8.1 13.6" {...s} />
      <Line x1={4} y1={17.5} x2={20} y2={17.5} {...s} />
    </GlyphSvg>
  );
};

export const LASO_GLYPHS = {
  emergencyCall: EmergencyCallGlyph,
  triagePulse: TriagePulseGlyph,
  visionScan: VisionScanGlyph,
  chatTriage: ChatTriageGlyph,
  locate: LocateGlyph,
  fracture: FractureGlyph,
  wound: WoundGlyph,
  burns: BurnsGlyph,
  choking: ChokingGlyph,
  bleeding: BleedingGlyph,
  cpr: CprGlyph,
  poisoning: PoisoningGlyph,
  allergy: AllergyGlyph,
  bites: BitesGlyph,
  unconscious: UnconsciousGlyph,
} as const;

export type LasoGlyphName = keyof typeof LASO_GLYPHS;
