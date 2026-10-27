// Centralized 3D Medical Illustration Registry
// Strongly-typed access to 3D claymorphic & glassmorphic assets

import { ImageSourcePropType } from 'react-native';

export type IllustrationKey =
  | 'splashEmblem'
  | 'welcomeShield'
  | 'heartVitals'
  | 'firstAidKit'
  | 'emergencyBeacon'
  | 'cprGuide'
  | 'achievementBadge'
  | 'neuralOrb'
  | 'visionScanner'
  | 'diagnosticMolecule'
  | 'recordCapsule'
  | 'hospitalLocator';

export interface IllustrationDefinition {
  key: IllustrationKey;
  screen: string;
  title: string;
  description: string;
  source: ImageSourcePropType | null;
  mode: 'brand' | 'vitals' | 'emergency' | 'ai' | 'report' | 'directory';
  /** Intrinsic pixel size of the transparent PNG (post-optimization). */
  pixelWidth: number;
  pixelHeight: number;
}

/**
 * Illustration assets are the *transparent* renders produced by
 * `mobile/scripts/process_illustrations.py` and compressed by
 * `mobile/scripts/optimize_illustrations.py`.
 *
 * The original JPEG renders remain in `mobile/assets/illustrations/` for
 * reference only and are intentionally NOT bundled.
 */
export const ILLUSTRATIONS: Record<IllustrationKey, IllustrationDefinition> = {
  splashEmblem: {
    key: 'splashEmblem',
    screen: 'SplashScreen',
    title: 'Laso+ Medical Emblem',
    description: 'Frosted glass medical cross with floating 3D ribbon',
    source: require('../../assets/illustrations/transparent/Medical_emblem_with_mobius_loop_2K_20261017115025.png'),
    mode: 'brand',
    pixelWidth: 492,
    pixelHeight: 512,
  },
  welcomeShield: {
    key: 'welcomeShield',
    screen: 'WelcomeScreen',
    title: 'Clinical Stethoscope & AI Shield',
    description: 'Translucent 3D medical shield with floating stethoscope',
    source: require('../../assets/illustrations/transparent/Medical_shield_and_stethoscope_h._2K_20261017115021.png'),
    mode: 'brand',
    pixelWidth: 412,
    pixelHeight: 512,
  },
  heartVitals: {
    key: 'heartVitals',
    screen: 'HomeScreen',
    title: 'Tactile Heart & Biometric Ring',
    description: '3D anatomical heart inside a floating biometric pulse ring',
    source: require('../../assets/illustrations/transparent/Heart_sculpture_in_biometric_ring_2K_20261017114951.png'),
    mode: 'vitals',
    pixelWidth: 450,
    pixelHeight: 512,
  },
  firstAidKit: {
    key: 'firstAidKit',
    screen: 'HomeScreen',
    title: 'First-Aid Kit Capsule',
    description: '3D isometric emergency first-aid kit with metallic latches',
    source: require('../../assets/illustrations/transparent/Isometric_first-aid_kit_capsule_2K_20261017114957.png'),
    mode: 'emergency',
    pixelWidth: 416,
    pixelHeight: 512,
  },
  emergencyBeacon: {
    key: 'emergencyBeacon',
    screen: 'LiveTriageScreen',
    title: 'Emergency Siren Beacon & Life-Ring',
    description: 'Vivid red medical alert siren with floating safety ring',
    source: require('../../assets/illustrations/transparent/Emergency_medical_alert_beacon_g._2K_20261017115009.png'),
    mode: 'emergency',
    pixelWidth: 512,
    pixelHeight: 438,
  },
  cprGuide: {
    key: 'cprGuide',
    screen: 'EmergencyStepScreen',
    title: 'CPR Chest Compression Guide',
    description: '3D anatomical model with illuminated compression depth rings',
    source: require('../../assets/illustrations/transparent/Anatomical_mannequin_demonstrati._2K_20261017115014.png'),
    mode: 'emergency',
    pixelWidth: 512,
    pixelHeight: 512,
  },
  achievementBadge: {
    key: 'achievementBadge',
    screen: 'EmergencySummaryScreen',
    title: 'Resolution Shield & Stethoscope',
    description: 'Celebratory medical safety shield with checkmark and golden stethoscope',
    source: require('../../assets/illustrations/transparent/Medical_achievement_badge_with_s._2K_20261017114904.png'),
    mode: 'brand',
    pixelWidth: 512,
    pixelHeight: 476,
  },
  neuralOrb: {
    key: 'neuralOrb',
    screen: 'AIChatScreen',
    title: 'Neural AI Core',
    description: 'Translucent glowing sphere representing the living AI core',
    source: require('../../assets/illustrations/transparent/Translucent_sphere_with_glowing_._2K_20261017145504.png'),
    mode: 'ai',
    pixelWidth: 512,
    pixelHeight: 512,
  },
  visionScanner: {
    key: 'visionScanner',
    screen: 'AIAnalysisScreen',
    title: 'Depth Scanner Reticle & Lidar Mesh',
    description: 'Holographic 3D medical vision scanner with projected grid',
    source: require('../../assets/illustrations/transparent/Medical_vision_scanner_projectin._2K_20261017114856.png'),
    mode: 'ai',
    pixelWidth: 512,
    pixelHeight: 504,
  },
  diagnosticMolecule: {
    key: 'diagnosticMolecule',
    screen: 'AIAnalysisScreen',
    title: 'Diagnostic Molecule & Data Core',
    description: '3D molecular lattice structure with floating pulse lines',
    source: require('../../assets/illustrations/transparent/Molecular_lattice_structure_2K_20261017145517.png'),
    mode: 'ai',
    pixelWidth: 512,
    pixelHeight: 512,
  },
  recordCapsule: {
    key: 'recordCapsule',
    screen: 'ReportPreviewScreen',
    title: 'Certified Medical Capsule',
    description: 'Cylindrical encrypted medical capsule with certified wax seal',
    source: require('../../assets/illustrations/transparent/Cylindrical_medical_record_capsule_2K_20261017114849.png'),
    mode: 'report',
    pixelWidth: 512,
    pixelHeight: 512,
  },
  hospitalLocator: {
    key: 'hospitalLocator',
    screen: 'ProviderListScreen',
    title: 'Hospital & Locator Pin',
    description: 'Isometric medical center with floating navigation pin and radar pulse',
    source: require('../../assets/illustrations/transparent/Hospital_building_with_map_pin_2K_20261017114840.png'),
    mode: 'directory',
    pixelWidth: 450,
    pixelHeight: 512,
  },
};

/**
 * Safely retrieve an illustration source image or null if not yet generated
 */
export function getIllustration(key: IllustrationKey): ImageSourcePropType | null {
  return ILLUSTRATIONS[key]?.source ?? null;
}
