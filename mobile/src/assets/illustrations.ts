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
}

export const ILLUSTRATIONS: Record<IllustrationKey, IllustrationDefinition> = {
  splashEmblem: {
    key: 'splashEmblem',
    screen: 'SplashScreen',
    title: 'Laso+ Medical Emblem',
    description: 'Frosted glass medical cross with floating 3D ribbon',
    source: require('../../assets/illustrations/Medical_emblem_with_mobius_loop_2K_20261017115025.jpg'),
    mode: 'brand',
  },
  welcomeShield: {
    key: 'welcomeShield',
    screen: 'WelcomeScreen',
    title: 'Clinical Stethoscope & AI Shield',
    description: 'Translucent 3D medical shield with floating stethoscope',
    source: require('../../assets/illustrations/Medical_shield_and_stethoscope_h._2K_20261017115021.jpg'),
    mode: 'brand',
  },
  heartVitals: {
    key: 'heartVitals',
    screen: 'HomeScreen',
    title: 'Tactile Heart & Biometric Ring',
    description: '3D anatomical heart inside a floating biometric pulse ring',
    source: require('../../assets/illustrations/Heart_sculpture_in_biometric_ring_2K_20261017114951.jpg'),
    mode: 'vitals',
  },
  firstAidKit: {
    key: 'firstAidKit',
    screen: 'HomeScreen',
    title: 'First-Aid Kit Capsule',
    description: '3D isometric emergency first-aid kit with metallic latches',
    source: require('../../assets/illustrations/Isometric_first-aid_kit_capsule_2K_20261017114957.jpg'),
    mode: 'emergency',
  },
  emergencyBeacon: {
    key: 'emergencyBeacon',
    screen: 'LiveTriageScreen',
    title: 'Emergency Siren Beacon & Life-Ring',
    description: 'Vivid red medical alert siren with floating safety ring',
    source: require('../../assets/illustrations/Emergency_medical_alert_beacon_g._2K_20261017115009.jpg'),
    mode: 'emergency',
  },
  cprGuide: {
    key: 'cprGuide',
    screen: 'EmergencyStepScreen',
    title: 'CPR Chest Compression Guide',
    description: '3D anatomical model with illuminated compression depth rings',
    source: require('../../assets/illustrations/Anatomical_mannequin_demonstrati._2K_20261017115014.jpg'),
    mode: 'emergency',
  },
  achievementBadge: {
    key: 'achievementBadge',
    screen: 'EmergencySummaryScreen',
    title: 'Resolution Shield & Stethoscope',
    description: 'Celebratory medical safety shield with checkmark and golden stethoscope',
    source: require('../../assets/illustrations/Medical_achievement_badge_with_s._2K_20261017114904.jpg'),
    mode: 'brand',
  },
  neuralOrb: {
    key: 'neuralOrb',
    screen: 'AIChatScreen',
    title: 'Neural AI Core',
    description: 'Translucent glowing sphere representing the living AI core',
    source: require('../../assets/illustrations/Translucent_sphere_with_glowing_._2K_20261017145504.jpg'),
    mode: 'ai',
  },
  visionScanner: {
    key: 'visionScanner',
    screen: 'WoundScannerScreen',
    title: 'Depth Scanner Reticle & Lidar Mesh',
    description: 'Holographic 3D medical vision scanner with projected grid',
    source: require('../../assets/illustrations/Medical_vision_scanner_projectin._2K_20261017114856.jpg'),
    mode: 'ai',
  },
  diagnosticMolecule: {
    key: 'diagnosticMolecule',
    screen: 'AIAnalysisScreen',
    title: 'Diagnostic Molecule & Data Core',
    description: '3D molecular lattice structure with floating pulse lines',
    source: require('../../assets/illustrations/Molecular_lattice_structure_2K_20261017145517.jpg'),
    mode: 'ai',
  },
  recordCapsule: {
    key: 'recordCapsule',
    screen: 'ReportPreviewScreen',
    title: 'Certified Medical Capsule',
    description: 'Cylindrical encrypted medical capsule with certified wax seal',
    source: require('../../assets/illustrations/Cylindrical_medical_record_capsule_2K_20261017114849.jpg'),
    mode: 'report',
  },
  hospitalLocator: {
    key: 'hospitalLocator',
    screen: 'ProviderListScreen',
    title: 'Hospital & Locator Pin',
    description: 'Isometric medical center with floating navigation pin and radar pulse',
    source: require('../../assets/illustrations/Hospital_building_with_map_pin_2K_20261017114840.jpg'),
    mode: 'directory',
  },
};

/**
 * Safely retrieve an illustration source image or null if not yet generated
 */
export function getIllustration(key: IllustrationKey): ImageSourcePropType | null {
  return ILLUSTRATIONS[key]?.source ?? null;
}
