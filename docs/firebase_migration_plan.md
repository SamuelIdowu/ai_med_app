# Firebase Migration Implementation Plan

This document outlines the step-by-step plan to migrate the **ai-med-app** from Supabase (Postgres, Auth, Storage) to Firebase (Firestore/Realtime DB, Authentication, Storage).

> [!IMPORTANT]
> **Spark Plan (Free Tier) Constraints**
> This plan is optimized for the Firebase Spark Plan.
> *   **No Cloud Functions**: We will use the existing Express Backend server (hosted on user's current infrastructure or a free service like Render/Vercel) to handle server-side logic.
> *   **Firestore Optimizations**: Limits are 50k reads/day and 20k writes/day. We will use **Denormalization** (duplicating data) to minimize reads.
> *   **Storage**: 5GB total storage limit.

## 1. Project Setup & Configuration

### 1.1. Create Firebase Project
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project.
3.  Enable **Authentication** (Email/Password, Google - Free Tier supported).
    *   **Note**: Phone Auth has a strict limit (3k/month) on the free plan, so avoid it if possible.
4.  Enable **Firestore Database**: Start in **Production Mode** (we will set rules later).
5.  Enable **Storage**.
6.  Generate **Service Account Key** for Backend:
    *   Project Settings -> Service accounts -> Generate new private key.
    *   Save this JSON file securely (e.g., `backend/service-account.json`). **DO NOT COMMIT THIS FILE.**

### 1.2. Environment Variables
Update `.env` files in both `mobile` and `backend`.

**Backend (`backend/.env`):**
```properties
# REMOVE/DEPRECATE
# supabaseUrl=...
# supabaseServiceKey=...

# ADD
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

**Mobile (`mobile/.env`):**
```properties
# REMOVE/DEPRECATE
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# ADD
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

## 2. Backend Migration

### 2.1. Install Dependencies
```bash
cd backend
npm install firebase-admin
npm uninstall @supabase/supabase-js
```

### 2.2. Create Firebase Config (`backend/src/config/firebase.ts`)
Create a singleton instance for Firebase Admin SDK.
```typescript
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
    });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
```

### 2.3. Migrate Middleware (`backend/src/middleware/auth.ts`)
Replace Supabase token verification with Firebase Admin verification.
```typescript
// OLD
// const { data: { user }, error } = await supabase.auth.getUser(token);

// NEW
// Verify the ID token sent from the client
const decodedToken = await auth.verifyIdToken(token);
req.user = { 
    id: decodedToken.uid, 
    email: decodedToken.email 
};
```

### 2.4. Data Modeling Strategy (Optimization for Free Tier)
To stay under 50k reads/day, we must avoid "Joins" (multiple reads).

*   **User Profiles (`users` collection)**:
    *   Store `email`, `name`, and `medicalProfile` data in a single document: `users/{userId}`.
    *   This ensures getting a profile cost only **1 Read**.
*   **Encounters (`encounters` collection)**:
    *   When listing encounters, we only query this collection.
    *   **Optimization**: If the UI needs the user's name on the encounter card, store `userName` *inside* the encounter document. This avoids fetching the User document for every encounter list item.
*   **Indexes**:
    *   Firestore requires indices for sorting/filtering. Creating indices is free and essential for performance.

### 2.5. Migrate Services
Refactor services to use Firestore.

**Example: `backend/src/services/encounterService.ts`**
*   **Create**: `db.collection('encounters').add({ userId: userId, ... })`
*   **Get**: `db.collection('encounters').doc(encounterId).get()`
*   **Query**: `db.collection('encounters').where('userId', '==', userId).orderBy('createdAt', 'desc').get()`

**Example: `backend/src/services/storageService.ts`**
*   **Uploads**:
    *   **Spark Plan Strategy**: Use the **Mobile Client SDK** to upload files directly to Firebase Storage. This offloads the bandwidth cost from your backend hosting to the client device.
    *   *Backend Role*: Only generate signed URLs if absolutely necessary for security, or for *downloads* of private files.
*   **Downloads**:
    *   If files are private: `bucket.file(path).getSignedUrl(...)`.
    *   If files are public (e.g. avatars): Use the public download URL.

## 3. Mobile Migration

### 3.1. Install Dependencies
```bash
cd mobile
npx expo install firebase
# If using managed workflow with expo-dev-client, allows native firebase SDKs.
# For strictly JS SDK (web/expo-go compatible):
npm install firebase
npm uninstall @supabase/supabase-js
```

### 3.2. Initialize Firebase (`mobile/src/services/firebase.ts`)
```typescript
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  // ... other config
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence to persist login across restarts
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

export { auth, db };
```

### 3.3. Update Auth Context (`mobile/src/context/AuthContext.tsx`)
*   Replace `supabase.auth.getSession` with `onAuthStateChanged`.
*   Replace `supabase.auth.signInWithPassword` with `signInWithEmailAndPassword`.
*   Replace `supabase.auth.signOut` with `signOut(auth)`.

### 3.4. Update Screens
*   **Login/Signup**: Update to use Firebase Auth functions.
*   ** API Calls**: 
    *   Use `auth.currentUser.getIdToken()` to get the JWT to send to backend.
    *   Ensure backend `auth.ts` middleware verifies this specific Firebase ID token.

## 4. Data Migration Strategy

### 4.1. Migration Script
Create a script in `backend/src/scripts/migrate-data.ts`.
1.  **Extract**: `supabase.from('table').select('*')`.
2.  **Transform**: Remap fields if necessary (e.g. flattening `users` + `medical_profiles`).
3.  **Load**: `db.collection('collection').doc(id).set(data)`.

## 5. Storage Migration
1.  Download files from Supabase Storage buckets locally or to a VM.
2.  Upload to Firebase Storage buckets using `gsutil` or a script with Firebase Admin SDK.
3.  Update references in Database if paths change.

## 6. Verification
1.  **Auth**: Test Login, Signup, Logout, Persistent Session.
2.  **Encounters**: Create, Read, Delete encounters.
3.  **Storage**: Verify uploads works (e.g. Profile pictures, Reports).
