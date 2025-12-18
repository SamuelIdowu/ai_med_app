# AI First Aid App — MVP Product Requirements Document (PRD)

## 1. Product Summary

A mobile-first application that provides fast, reliable, profile-personalized first-aid guidance, supports emergency actions, stores encrypted medical profiles, enables guided photo capture, and allows users to share structured emergency reports with clinicians or emergency contacts.

The MVP focuses on **immediate first aid only**, with clear safety boundaries (no diagnostic claims), offline accessibility, and strong privacy protections.

---

## 2. Goals & Objectives

### Primary Goal

Provide users with quick, accurate, easy-to-follow first-aid steps in emergencies.

### Secondary Goals

* Enable users to store essential medical profile details securely.
* Allow structured sharing of emergency data (profile + photos).
* Build user trust with safety-first design.

### Success Metrics

* Emergency flow start rate: ≥ 40% of active users
* Emergency flow completion: ≥ 70% of starts
* Profile completion: ≥ 60% of new users
* Zero high-severity safety incidents in the pilot
* Day 7 retention ≥ 20%

---

## 3. Target Users (MVP Scope)

* Digitally active individuals aged 16–40
* Regions: Nigeria or similar emerging markets (expand later)
* Users with limited first-aid knowledge
* Users without reliable emergency response systems

---

## 4. Core MVP Features

### 4.1 Onboarding & User Authentication

* Email or phone-based signup
* Consent screens for

  * Storing medical info
  * Photo storage
  * Emergency report sharing
* Optional emergency contact setup

### 4.2 Medical Profile

* User details: name, age, blood type (optional)
* Allergies
* Medications
* Chronic conditions
* Emergency contact(s)
* All data encrypted at rest and in transit

### 4.3 Emergency First-Aid Engine (Offline-Capable)

* Rule-based, non-diagnostic first-aid guides:

  * Bleeding
  * Burns
  * Choking
  * CPR basics
  * Unconsciousness response
* Clear step-by-step instructions
* Large buttons, high accessibility text
* Prominent **Call Emergency Services** button
* Works offline after initial sync

### 4.4 Guided Photo Capture (Optional)

* Camera access with lighting/position prompts
* Photos stored encrypted locally
* No AI diagnosis in MVP
* User-controlled delete option

### 4.5 Emergency Report Sharing

* Generates structured report:

  * User profile (limited fields)
  * Timestamped notes
  * Photos (if user chooses)
  * Consent statement
* Share via email, WhatsApp, or other share-sheet channels

### 4.6 Provider Directory (Basic)

* List of nearest clinics/hospitals
* Filter: general practice, emergency, pharmacy
* Call, map direction links

### 4.7 Analytics & Logging

* Log emergency flow starts & completions
* Log report shares
* Crash reporting
* Audit log for data access (security)

---

## 5. Non-Functional Requirements

### Privacy & Security

* Explicit consent required
* Encryption at rest (AES-256)
* TLS for all network calls
* Data deletion/export capability
* Minimal data retention policy

### Performance

* Emergency screen loads in ≤ 3 seconds
* Offline content accessible instantly
* Photo capture responsiveness ≤ 500ms

### Reliability

* App should function offline for core flows
* Crash-free sessions ≥ 99%

### Safety

* Conservative instructions
* Multiple safety reminders:

  * "This is not medical advice."
  * "Call emergency services if unsure."

---

## 6. User Flows (High-Level)

### 6.1 Onboarding Flow

1. Open app → intro screens
2. Consent → create account
3. Add medical profile
4. Setup emergency contact
5. Land on Home

### 6.2 Emergency First-Aid Flow

1. Tap **Emergency** button
2. Select emergency type (bleeding, burn, choking, etc.)
3. Step-by-step instructions
4. Optional: capture photo
5. Call emergency contact or emergency services
6. Option to generate/share report

### 6.3 Share Report Flow

1. User taps **Share Report**
2. Preview: profile + photos + timestamp
3. Confirm consent
4. Choose sharing method
5. Log event

---

## 7. Out-of-Scope (MVP)

* AI diagnosis from photos
* On-device AI for triage
* Telemedicine booking
* In-app chat or video with clinicians
* Full clinical dashboards
* Gamification or badges

---

## 8. Dependencies & Integrations

* Push notifications (FCM/APNs)
* Secure storage (e.g., Supabase Storage / local encrypted store)
* Basic map integrations (Google Maps/Apple Maps)
* Crash reporting (Sentry or Firebase)

---

## 9. Risks & Mitigations

| Risk                                    | Impact | Mitigation                                                                 |
| --------------------------------------- | ------ | -------------------------------------------------------------------------- |
| Incorrect first-aid steps misunderstood | High   | Simple instructions, illustrations, strong CTAs to call emergency services |
| Privacy breach of medical data          | High   | Encryption, consent, minimal retention                                     |
| Low retention                           | Medium | Add reminders, preventive content later                                    |
| Users expect diagnosis                  | Medium | Clear copy: "Not diagnostic" repeated across flows                         |

---

## 10. Acceptance Criteria Summary

* User can register and edit profile
* Consent collected and stored
* Emergency flows fully functional offline
* First-aid steps readable, accessible, and load fast
* Photo capture encrypted end-to-end
* Report sharing produces correct exported package
* Provider directory works and contains seed data
* Logging and crash reporting enabled

---

## 11. MVP Launch Checklist

* [ ] Final first-aid content validated by a medically knowledgeable person
* [ ] Privacy policy published
* [ ] App icon + store listing assets prepared
* [ ] Emergency flows thoroughly tested
* [ ] Pilot testing conducted (50–200 users)
* [ ] No critical bugs

---

## 12. Roadmap After MVP

* Add teleconsult options
* Add on-device AI helpers (non-diagnostic)
* Expand emergency categories
* Add localization & multi-language support
* Partner with clinics for B2B referral flows
