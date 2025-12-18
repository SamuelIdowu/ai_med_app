🚀 AI First Aid App — Project Setup Guide (MVP)

This guide walks you through setting up the development environment, project structure, dependencies, Supabase + Vercel + Expo integration, and initial configuration for both mobile and backend.

1 — Prerequisites
System Requirements

Node.js (v18+ recommended)

Yarn or npm

Git

VS Code (recommended)

Android Studio (for Android emulator) / Xcode (for iOS)

Accounts Required

GitHub (for repo + CI)

Supabase (DB, Storage, Auth)

Vercel or Render (backend)

Expo (mobile builds)

Sentry (error logging, optional)

Firebase (push notifications)

2 — Project Structure (Monorepo Recommended)
ai-first-aid/
  mobile/          # React Native (Expo)
    src/
    assets/
    app.config.js
    package.json

  backend/         # Node.js or Vercel serverless API
    src/
      routes/
      controllers/
      services/
      middleware/
    package.json

  infra/
    supabase/      # SQL migrations, types
    scripts/

  README.md

3 — Step-by-Step Setup
🔧 Step 1: Initialize Git & Monorepo
mkdir ai-first-aid
cd ai-first-aid
git init


Create directories:

mkdir mobile backend infra

📱 Step 2: Mobile App Setup (React Native + Expo)
2.1 Create the Expo app
cd mobile
npx create-expo-app .


Choose blank (TypeScript) template.

Install essential dependencies:

yarn add axios
yarn add expo-secure-store
yarn add react-navigation
yarn add @react-navigation/native-stack
yarn add react-native-encrypted-storage
yarn add expo-image-picker
yarn add expo-file-system
yarn add expo-sharing
yarn add expo-camera
yarn add expo-notifications


Install required Expo packages:

npx expo install expo-constants expo-permissions


Init TypeScript types if missing:

touch tsconfig.json

2.2 Setup Navigation

Install:

yarn add @react-navigation/native
yarn add @react-navigation/stack


Run app:

npx expo start

🗄 Step 3: Set Up Supabase (DB + Storage + Auth)
3.1 Create a new Supabase project

Go to https://supabase.com/dashboard

3.2 Enable Auth

Settings → Auth → Turn ON:

Email (required)

Phone (optional)

3.3 Create database schema

In SQL editor, paste your tables:

users

medical_profiles

encounters

photos

reports

providers

audit_logs

(Use the schema from the Technical Architecture doc)

3.4 Create storage buckets

Buckets:

photos (public off, RLS ON)

reports (public off, RLS ON)

Set upload rules to allow only authenticated users.

3.5 Generate API URLs

Settings → API → copy:

SUPABASE_URL

SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY (use carefully, for backend only)

🌐 Step 4: Backend Setup (Node.js or Vercel Functions)
4.1 Initialize backend
cd backend
npm init -y
npm install express cors axios dotenv
npm install --save-dev typescript ts-node nodemon @types/express @types/node
npx tsc --init

4.2 Add folder structure
backend/src/
  index.ts
  routes/
  controllers/
  services/
  middleware/

4.3 Install Supabase server SDK
npm install @supabase/supabase-js

4.4 Add storage & report generation dependencies
npm install pdf-lib
npm install uuid

4.5 Create a .env file
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=your_secret_here

4.6 Start the backend
npm run dev

🔐 Step 5: Environment Variable Setup (Fully Integrated)

At root folder create:

.env


Add variables:

EXPO_PUBLIC_SUPABASE_URL=xxx
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx

BACKEND_URL=https://your-api-url.vercel.app

📤 Step 6: Connect Mobile App to Backend

Add API setup inside mobile/src/services/api.ts:

import axios from 'axios';
export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL,
});


Add Supabase client inside mobile/src/services/supabase.ts:

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

🧱 Step 7: Implement Core Modules
7.1 First Aid Content (Offline)

Create:

mobile/src/content/first-aid.json


Structure:

{
  "bleeding": [
    { "step": "Apply pressure", "icon": "pressure.png" },
    { "step": "Elevate limb", "icon": "lift.png" }
  ],
  "burns": [...]
}


Load it locally.

7.2 Medical profile storage

Use Supabase for persistent storage.
Use Expo SecureStore for local caching.

7.3 Photo Capture & Encryption

Use:

expo-camera for photos

expo-file-system for temp storage

react-native-encrypted-storage for local encrypted files

Upload sequence:

Capture photo

Encrypt

Request signed URL from backend

Upload blob

Notify backend

7.4 Report Generation

Backend will:

Fetch encounter + profile

Fetch photos

Assemble PDF (pdf-lib)

Store encrypted file

Return signed URL

App opens system share sheet

📍 Step 8: Provider Directory (Seed Data)

Add a seed SQL script in infra/supabase/seed_providers.sql

INSERT INTO providers (name, type, address, phone, lat, lng)
VALUES
('City Clinic', 'clinic', '123 Main St', '+123456789', 6.5244, 3.3792),
('General Hospital', 'hospital', '45 Broad Rd', '+123456789', 6.4500, 3.4000);


Run via Supabase SQL editor.

🔍 Step 9: Logging, Analytics & Error Monitoring

Install:

# mobile
npx expo install sentry-expo

# backend
npm install @sentry/node


Initialize in app + backend.

Analytics:
Install PostHog:

npm install posthog-js


Track events:

emergency_flow_start

emergency_flow_complete

photo_taken

report_shared

🧪 Step 10: Testing Setup

Mobile testing:

npm install --save-dev jest @testing-library/react-native


Backend testing:

npm install --save-dev jest supertest


Write basic tests for:

Profile creation

Encounter creation

Report generation

🚀 Step 11: CI/CD Setup (GitHub + Vercel + Expo)
11.1 GitHub Actions

Create .github/workflows/deploy.yml

name: Deploy App

on:
  push:
    branches:
      - main

jobs:
  backend-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm install && npm run build
      - uses: vercel/action@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

  expo-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: cd mobile && npm install
      - run: npx expo prebuild

📦 Step 12: Local Development Workflow
Start backend
cd backend
npm run dev

Start mobile app
cd mobile
npx expo start


Scan QR code → open on device or emulator.

🧹 Step 13: Maintenance Tips

Keep offline content versioned (e.g., version: 1.0.0).

Use feature flags (in-app remote config) for future emergency types.

Set database backups to daily in Supabase.

Rotate API keys quarterly.

Monitor app with Sentry weekly.

✔️ Step 14: Project Ready Checklist
Mobile

 First-aid content loads offline

 Emergency flow works fully

 Photo capture + encryption works

 Report sharing functional

 Profile save/edit works

Backend

 Supabase schema deployed

 API endpoints tested

 Report generator works

 Provider directory seeded

Infrastructure

 ENV variables configured

 CI/CD running

 Sentry & PostHog configured