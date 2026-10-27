import { PhotoAnalysisMode } from '../types/photoAnalysis';
import type { Provider } from '../services/types';

export type RootStackParamList = {
    Splash: undefined;
    Welcome: undefined;
    Permissions: undefined;
    Login: undefined;
    Signup: undefined;
    CreateProfile: undefined;
    Home: undefined;
    History: undefined;
    EmergencySteps: undefined;
    EmergencySummary: { encounterId: string };
    MedicalProfile: undefined;
    Camera: { stepId?: string };
    PhotoPreview: { photoUri: string; stepId?: string };
    ReportPreview: { encounterId: string };
    ProviderList: undefined;
    ProviderDetail: { providerId: string; provider?: Provider };
    Settings: undefined;
    PrivacyPolicy: undefined;
    AITools: undefined;
    Notifications: undefined;
    FirstAidList: undefined;
    LiveTriage: { encounterId?: string; apiBaseUrl?: string; initialQuery?: string } | undefined;
    AIChat: undefined;
    AIAnalysis: { photoUri?: string; mode?: PhotoAnalysisMode } | undefined;
};
