# Screen Flow Order

Based on `docs/ui.md` and the `docs/ui` directory structure, here is the intended order of screens:

## 1. Launch
- **Splash Screen** (`splash_screen`)

## 2. Onboarding Flow
- **Welcome** (`welcome_screen`)
- **Consent & Permissions**
  - Step 1 (`consent_&_permissions_1`)
  - Step 2 (`consent_&_permissions_2`)
- **Create Profile** (`create_profile`)

## 3. Main Interface
- **Home Screen** (`home_screen`)

## 4. Emergency Flow (Triggered from Home)
- **Step View** (`emergency_flow__step_view`)
- **Final Step / Summary** (`emergency_flow__final_step`)

## 5. Photo Capture Flow
- **Instructions** (`photo_capture__instructions`)
- **Camera View** (`photo_capture__camera`)
- **Preview & Consent** (`photo_capture__preview_&_consent`)

## 6. Share Report Flow (Triggered from Emergency Summary or Home)
- **Preview Report** (`share_report__preview`)
- **Share Options** (`share_report__options`)

## 7. Secondary Features
- **Medical Profile** (`medical_profile`)
- **Provider Directory**
  - List View (`provider_directory__list`)
  - Details View (`provider_directory__details`)
- **Settings & Privacy** (`settings_&_privacy`)
