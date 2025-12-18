# Sprint 3: Advanced Features & Polish (Weeks 7-10)

## Goal
Implement the report sharing capability, provider directory, and ensure system observability.

## Deliverables
- [x] **Report Generation**: Backend service to assemble PDF reports from encounter data.
- [x] **Provider Directory**: Map/List view of nearby providers.
- [x] **Analytics**: Integration of PostHog/Firebase.
- [x] **Crash Reporting**: Sentry integration.

## Detailed Implementation Tasks

### 1. Reports & Sharing UI
> Reference: `docs/ui/share_report__preview`, `docs/ui/share_report__options`
- [x] **Report Preview Screen**
  - [x] Display Patient Summary (Name, Age, etc.).
  - [x] Display Incident details & Photos.
  - [x] Implement "Privacy Notice" warning.
- [x] **Share Action**
  - [x] Integrate system Share Sheet (WhatsApp, Email).
  - [x] Implement Backend PDF Generation trigger.

### 2. Provider Directory UI
> Reference: `docs/ui/provider_directory__list`, `docs/ui/provider_directory__details`
- [x] **List View**
  - [x] Implement Search Bar "Search hospitals...".
  - [x] Implement Provider Cards (Name, Type, Distance).
  - [x] Implement "Find Nearest" FAB.
- [x] **Map View**
  - [x] Integrate Map Component (Google/Apple Maps).
  - [x] Pin rendering for providers.
- [x] **Provider Detail**
  - [x] Show Address, Phone, Navigate button.

### 3. Observability
- [x] Verify Analytics events on "Share Report" and "Emergency Start".

## Acceptance Criteria
- User can generate a link/file for an emergency report.
- Report contains correct profile and photo data.
- User can see a list of providers (mocked or real).
- Analytics dashboard shows active events.
