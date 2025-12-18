# AI First Aid App — MVP UI Wireframe Document

This document outlines the **full UI wireframe structure** for the MVP. It includes screen-by-screen layouts, component placement, user interactions, and UX notes. Use this as a blueprint for Figma or direct implementation.

---

# 1. Design Principles

* **Emergency-first:** Quick access to life-saving steps.
* **Clarity:** Large buttons, clean hierarchy, minimal text.
* **Accessibility:** High-contrast colors, readable text, simple icons.
* **Offline-first:** Critical flows must work without internet.
* **Privacy-first:** Clear consent and data boundaries.

---

# 2. Color, Typography & Layout (Suggested)

### Colors

* **Primary:** Red (#E53935) for emergency actions
* **Secondary:** Dark Gray (#333333)
* **Neutral:** Light Gray (#F2F2F2)
* **Accent:** Blue (#1976D2) for links & CTAs

### Typography

* **Headings:** Bold, 20–24px
* **Body:** 16–18px
* **Emergency Steps:** 20px, extra bold

### Layout

* Padding: 16–24px
* Corner radius: 8–12px
* Buttons: Full-width for key actions
* Icon size: 28–32px

---

# 3. App Structure Overview

```
Splash Screen
Onboarding
    ├── Welcome
    ├── Permissions + Consent
    └── Create Profile
Home Screen
    ├── Emergency CTA
    ├── First Aid Categories
    ├── Quick Actions
Emergency Flow (Step-by-Step)
    ├── Step View
    ├── Progress Indicator
    └── Call Emergency Services
Photo Capture Flow
Share Report Flow
Medical Profile
Provider Directory
Settings & Privacy
```

---

# 4. Screen-by-Screen Wireframes

## 4.1 Splash Screen

### Layout

* Centered logo
* Subtext: "First Aid. Fast. Offline. Reliable."

### Components

* App logo
* Fade-in animation

---

## 4.2 Onboarding Flow

### **Screen 1 — Welcome**

Layout:

* Logo at top
* Title: "Your First Aid Companion"
* Subtitle: "Reliable offline steps for emergencies."
* CTA button: **Get Started**
* Secondary link: “Already have an account? Sign In”

### **Screen 2 — Consent & Permissions**

Sections:

* Text blocks explaining:

  * Data usage
  * Photo permissions
  * Emergency report sharing
* Toggle agreements
* CTA: **I Agree & Continue**

### **Screen 3 — Create Profile**

Fields:

* Full Name
* Age
* Blood Type (Optional dropdown)
* Allergies (Chips + Add button)
* Medications
* Chronic Conditions
* Emergency Contact (Name, Phone)

CTA: **Save Profile**

---

## 4.3 Home Screen

Layout:

* Top bar: "Hello, [Name]"
* Big red button: **EMERGENCY** (full-width)
* Section: “First Aid Categories”

  * Grid of cards (Bleeding, Burns, Choking, CPR, Unconsciousness)
* Section: “Quick Actions”

  * Photo Upload (icon)
  * Share Report
  * Provider Directory

UX Notes:

* Emergency button must remain visible when scrolling.
* Categories use icons + short labels.

---

## 4.4 Emergency Flow (Step-by-Step)

### Screen Layout

* Header: Back arrow + Emergency Type
* Progress bar: steps 1–5
* Large step card:

  * Step title (e.g., "Apply Pressure")
  * Icon/illustration
  * Instruction text (2–3 lines)
* Bottom buttons:

  * **Next Step**
  * Secondary: "Call Emergency Services"

### Final Step

* Summary
* Buttons:

  * **Share Report**
  * **Go Home**

---

## 4.5 Guided Photo Capture Flow

### Screen 1 — Instructions

* Title: "Take a Photo"
* Text: "Ensure good lighting and hold the phone steady."
* Bullet tips
* CTA: **Open Camera**

### Screen 2 — Camera

* Native camera view
* Overlay guides (edges rounded rectangle)
* Capture button (large circle)

### Screen 3 — Preview & Consent

* Display captured image
* Toggle: “I consent to include this image in my emergency report.”
* Buttons:

  * **Save Photo**
  * **Retake**

---

## 4.6 Share Report Flow

### Screen 1 — Preview Report

* Title: "Emergency Report"
* Sections:

  * Profile summary
  * Timestamp
  * Added notes
  * Photo thumbnails

CTA: **Share Report**

### Screen 2 — Share Options

* System share sheet popup (WhatsApp, email, etc.)

---

## 4.7 Medical Profile

### Layout

* Editable fields:

  * Personal info
  * Allergies (chip list)
  * Medications
  * Chronic conditions
  * Emergency contact
* Button: **Save Changes**

### Secondary

* Button: "Download My Data"
* Button: "Delete My Data"

---

## 4.8 Provider Directory

### Screen 1 — List View

* Search bar
* Filter: Hospital / Clinic / Pharmacy
* Provider cards show:

  * Name
  * Distance
  * Specialty
  * Call button

### Screen 2 — Provider Details

* Map preview
* Address
* Phone number
* "Open in Maps" link

---

## 4.9 Settings & Privacy

Items:

* Edit Profile
* Manage Consent
* Data Export
* Data Delete
* About & Disclaimer
* Logout

---

# 5. Micro-Interaction Notes

* Emergency button pulses slightly to draw attention.
* Step transitions use slide-left animations.
* Photo preview uses fade-in.
* Share confirmation uses subtle vibration.
* Empty states use friendly icons.

---

# 6. Accessibility Considerations

* Large touch targets (>48px)
* Voice instructions for emergency steps (Phase 2 option)
* High-contrast mode
* Offline content always available

---

# 7. Future UI Enhancements (Post-MVP)

* Dark mode
* Interactive illustrations for first-aid actions
* SOS widget on lock screen
* AI-assisted photo clarity guidance
* Multi-language support

---

# End of Wireframes Document


