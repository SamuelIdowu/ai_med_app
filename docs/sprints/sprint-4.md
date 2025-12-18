# Sprint 4: Hardening & Launch (Weeks 11-12)

## Goal
Final polish, security audit, and preparation for pilot launch.

## Deliverables
- [ ] **Pilot Build**: Production-ready binary (APK/IPA).
- [ ] **Security Audit**: Review of encryption and data privacy compliance.
- [ ] **Performance Tuning**: Ensure offline load times < 3s.
- [ ] **Marketing Assets**: App icon, store listings (if applicable).

## Detailed Implementation Tasks

### 1. Settings & Final Polish
> Reference: `docs/ui/settings_&_privacy`
- [x] **Settings Screen**
  - [x] Implement "Manage Consent" section.
  - [x] Implement "Data Export" and "Data Delete" buttons (GDPR compliance).
  - [x] Implement "Logout" functionality.
- [x] **UI Polish**
  - [x] Verify consistent Color Palette (Red #E53935).
  - [x] Verify Typography consistency (Bold headings).
  - [x] Ensure touch targets > 48px (Accessibility).

### 2. Launch Prep
- [x] **Security Audit**: Verify simple/secure storage of tokens.
- [x] **Offline Test**: Verify Emergency Flow works 100% without network.
- [x] **Pilot Build**: Submit binaries for internal review.

## Acceptance Criteria
- No critical bugs (P0).
- App passes all privacy/security checks.
- Build successfully deployed to pilot users.
