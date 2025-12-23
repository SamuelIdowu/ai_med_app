export type RootStackParamList = {
    Splash: undefined;
    Welcome: undefined;
    Permissions: undefined;
    Login: undefined;
    Signup: undefined;
    Home: undefined;
    History: undefined;
    EmergencySteps: undefined;
    EmergencySummary: { encounterId: string };
    MedicalProfile: undefined;
    PhotoInstructions: undefined;
    Camera: { stepId?: string }; // Assuming camera might take params
    PhotoPreview: { photoUri: string; stepId?: string };
    ReportPreview: { encounterId: string };
    ProviderList: undefined;
    ProviderDetail: { providerId: string };
    Settings: undefined;
    AITools: undefined;
    Notifications: undefined;
};
