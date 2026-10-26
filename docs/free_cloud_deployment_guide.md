# Laso: Free Cloud Infrastructure & Deployment Guide

This guide details how to host and deploy the entire **Laso** medical ecosystem at **$0/month** on production-ready free tiers, before migrating to AWS/GCP enterprise clusters.

---

## 1. Cloud Architecture at $0/Month

```
                   ┌────────────────────────────────────────┐
                   │               Laso App                 │
                   │      (iOS & Android Mobile App)        │
                   └──────────────────┬─────────────────────┘
                                      │ HTTPS
                                      ▼
                   ┌────────────────────────────────────────┐
                   │        Render (Free Web Service)       │
                   │    laso-backend (Node.js & Express)    │
                   └──────────┬───────────────────┬─────────┘
                              │                   │
                Internal HTTPS│                   │ HTTPS / WebSocket
                              ▼                   ▼
    ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
    │  Hugging Face Spaces or Render   │   │       Supabase (Free Tier)       │
    │  laso-ml (Python FastAPI Engine) │   │ PostgreSQL + Auth + Storage      │
    │  (16 GB RAM / 2 vCPU on HF)      │   │ + pgvector embeddings            │
    └──────────────────────────────────┘   └──────────────────────────────────┘
```

| Service | Recommended Platform | Free Tier Quota | Role in Laso |
| :--- | :--- | :--- | :--- |
| **Database & Auth** | **Supabase** | 500 MB DB, 50K MAU, 1GB Storage | Encounters, RLS security, Medical embeddings |
| **API Gateway & SSE** | **Render** | 512 MB RAM, Free TLS, Web Service | REST API, SSE live streaming, Gemini fallback |
| **ML Engine** | **Hugging Face Spaces** *(or Render)* | **16 GB RAM**, 2 vCPU, Docker container | Classical triage, PyTorch wound vision, Safety guardrails |
| **Mobile Client** | **Expo EAS** | Free build credits / month | APK / AAB generation for Android & iOS |

---

## 2. Step 1: Supabase Configuration (Free)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Run every migration in `backend/src/db/migrations/` in filename order
   (`000_initial_schema.sql` through `009_reconcile_core_schema.sql`).
4. Create a storage bucket named `medical-images` with Private access.
5. In **Project Settings** $\rightarrow$ **API**, copy:
   - `Project URL`
   - `anon` public key
   - `service_role` secret key

---

## 3. Step 2: Deploy Backend & ML to Render (1-Click Blueprint)

Laso includes a pre-configured `render.yaml` infrastructure-as-code file:

1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com).
3. Click **New +** $\rightarrow$ **Blueprint**.
4. Select your `ai-med-app` repository.
5. Render will automatically detect `render.yaml` and configure both services:
   - `laso-backend`
   - `laso-ml`
6. In the environment variable prompts, enter:
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret
   - `GEMINI_API_KEY`: Your Google Gemini API key
7. Click **Apply**. Both microservices will build from Docker and go live with free HTTPS URLs!

---

## 4. Alternative: Deploy ML Engine on Hugging Face Spaces (High RAM)

If you wish to run large PyTorch models or fine-tuned LoRA weights that exceed 512MB RAM:

1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **Create new Space**.
2. Name: `laso-ml`.
3. SDK: Choose **Docker** (Blank).
4. Hardware: Select the default **CPU Basic (2 vCPU, 16 GB RAM - Free)**.
5. In the created Git repository, copy the contents of the `ml/` directory (`Dockerfile`, `pyproject.toml`, `app/`, `models/`, `data/`).
6. Hugging Face will automatically build and start the FastAPI service.
7. Set `ML_SERVICE_URL=https://<your-username>-laso-ml.hf.space` in your `laso-backend` Render environment variables.

---

## 5. Step 3: Connect Mobile Client to Cloud Backend

In `mobile/.env`, update the backend endpoint with your Render backend URL:

```env
EXPO_PUBLIC_BACKEND_URL=https://laso-backend.onrender.com/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

When building production binaries with EAS, create these variables in the
Expo dashboard under **Environment Variables -> production** (or use
`eas env:create`):

```text
EXPO_PUBLIC_BACKEND_URL=https://laso-backend.onrender.com/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<optional-android-maps-key>
```

`mobile/app.config.js` blocks production builds that use a localhost or
private LAN backend URL.

---

## 6. Step 4: Build Mobile Binaries via EAS

With branding and bundle IDs now configured in `app.json`:

```bash
# Build standalone Android APK for immediate testing:
npm run build:apk

# Build Google Play Production App Bundle (.aab):
npm run build:appbundle
```
