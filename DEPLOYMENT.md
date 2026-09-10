# FoodTrail Production Deployment Guide

<!--
File: DEPLOYMENT.md
Description: Step-by-step production deployment runbook for Cloudflare Pages (Frontend) and Render (Backend API + Admin Panel).
Author: Akilan M
Created: 2026-09-10T16:03:30+05:30
-->

This guide provides end-to-end instructions for deploying the FoodTrail application across production cloud providers:
- **Frontend App (PWA)** $\rightarrow$ **Cloudflare Pages**
- **Backend API (Node/Express)** $\rightarrow$ **Render Web Service**
- **Admin Panel (Next.js)** $\rightarrow$ **Render Static Site**
- **Database** $\rightarrow$ **MongoDB Atlas**
- **Media Storage** $\rightarrow$ **Cloudinary CDN**
- **Email Delivery** $\rightarrow$ **Brevo API**

---

## Architecture Topology

```
┌──────────────────────────────────────────────┐
│             User Browser / PWA               │
│        (https://foodtrail.pages.dev)         │
└──────────────────────┬───────────────────────┘
                       │ HTTPS / Client API Calls
                       ▼
┌──────────────────────────────────────────────┐      ┌─────────────────────────┐
│              Render Web Service              │◄────┤   Render Static Site    │
│    (https://foodtrail-backend.onrender.com)  │      │     (Admin Panel)       │
└──────┬───────────────┬────────────────┬──────┘      └─────────────────────────┘
       │               │                │
       ▼               ▼                ▼
┌──────────────┐┌──────────────┐┌──────────────┐
│MongoDB Atlas ││Cloudinary CDN││  Brevo Email │
└──────────────┘└──────────────┘└──────────────┘
```

---

## Prerequisites Checklist

1. [GitHub](https://github.com/) account with the `food_trail` repository pushed.
2. [Render](https://render.com/) account.
3. [Cloudflare](https://dash.cloudflare.com/) account.
4. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free M0 cluster).
5. [Cloudinary](https://cloudinary.com/) account.
6. [Brevo](https://www.brevo.com/) account (for email verification OTPs).

---

## Step 1: Database Setup (MongoDB Atlas)

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create a new **Free (M0)** Cluster (e.g. AWS / us-east-1 or ap-south-1).
3. **Database Access**:
   - Create a database user (e.g., `foodtrail_prod_user`) with a strong password.
   - Assign built-in role: `readWriteAnyDatabase`.
4. **Network Access**:
   - Add IP Access: `0.0.0.0/0` (Allow access from anywhere, required for dynamic cloud IPs on Render).
5. **Connection String**:
   - Click **Connect** $\rightarrow$ **Drivers** (Node.js).
   - Copy the URI:
     ```
     mongodb+srv://foodtrail_prod_user:<password>@cluster0.abcde.mongodb.net/foodtrail?retryWrites=true&w=majority
     ```

---

## Step 2: Deploy Backend & Admin Panel on Render

### Option A: 1-Click Render Blueprint (Recommended)

The repository includes a ready-to-use [`render.yaml`](./render.yaml) Blueprint.

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Select your `food_trail` GitHub repository.
4. Render will parse `render.yaml` and create two services:
   - `foodtrail-backend` (Node.js Web Service)
   - `foodtrail-admin` (Static Web Service)
5. Fill in the required environment secrets when prompted:
   - `MONGO_URI`: Your MongoDB Atlas URI.
   - `BREVO_API_KEY`: Your Brevo API key.
   - `BREVO_SENDER_EMAIL`: Your verified sender email address.
   - `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name.
   - `CLOUDINARY_API_KEY`: Cloudinary API key.
   - `CLOUDINARY_API_SECRET`: Cloudinary API secret.
   - `ADMIN_INITIAL_PASSWORD`: Initial secure password for the default admin (`admin@foodtrail.com`).
6. Click **Apply**.

---

### Option B: Manual Setup via Render Dashboard

#### 1. Backend Web Service:
- **Type**: Web Service
- **Name**: `foodtrail-backend`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
- **Environment Variables**:
  | Variable | Example / Description |
  | :--- | :--- |
  | `NODE_ENV` | `production` |
  | `PORT` | `10000` |
  | `MONGO_URI` | `mongodb+srv://.../foodtrail` |
  | `JWT_SECRET` | *(64-char random hex string)* |
  | `FRONTEND_URL` | `https://foodtrail.pages.dev` |
  | `ADMIN_FRONTEND_URL` | `https://foodtrail-admin.onrender.com` |
  | `BREVO_API_KEY` | `xkeysib-...` |
  | `BREVO_SENDER_EMAIL` | `noreply@yourdomain.com` |
  | `BREVO_SENDER_NAME` | `FoodTrail Puducherry` |
  | `CLOUDINARY_CLOUD_NAME` | `n7inrkdf` |
  | `CLOUDINARY_API_KEY` | `652556289183442` |
  | `CLOUDINARY_API_SECRET` | `GY0PEKFq2jaJKp5b2JltH3sIa8k` |
  | `ADMIN_EMAIL` | `admin@foodtrail.com` |
  | `ADMIN_INITIAL_PASSWORD` | *(Secure initial admin password)* |

#### 2. Admin Frontend Static Site:
- **Type**: Static Site
- **Name**: `foodtrail-admin`
- **Root Directory**: `admin-frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `out`
- **Rewrite Rules**:
  - Source: `/*` $\rightarrow$ Destination: `/index.html` (Rewrite)
- **Environment Variables**:
  | Variable | Value |
  | :--- | :--- |
  | `NEXT_PUBLIC_API_URL` | `https://foodtrail-backend.onrender.com/api` |

---

## Step 3: Deploy Frontend to Cloudflare Pages

### Option A: Cloudflare Dashboard (Git Integration)

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, go to **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git**.
3. Select your `food_trail` repository.
4. Configure the build settings:
   - **Project Name**: `foodtrail` (Yields `https://foodtrail.pages.dev`)
   - **Framework Preset**: `Next.js (Static HTML Export)`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `out`
5. Expand **Environment Variables** and add:
   | Variable Name | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | `https://foodtrail-backend.onrender.com/api` |
   | `NODE_VERSION` | `20` |
6. Click **Save and Deploy**.

---

### Option B: Cloudflare Wrangler CLI

If you prefer deploying via terminal using Cloudflare's Wrangler CLI:

```bash
# 1. Install Wrangler globally or use npx
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Build the frontend locally with production API URL
cd frontend
NEXT_PUBLIC_API_URL="https://foodtrail-backend.onrender.com/api" npm run build

# 4. Deploy to Cloudflare Pages
npx wrangler pages deploy out --project-name=foodtrail
```

---

## Step 4: Synchronize CORS & Allowed Domains

> [!IMPORTANT]
> The backend enforces strict origin whitelisting and will **ONLY** accept requests from origins explicitly defined in your environment variables. No arbitrary origins or wildcards are permitted.

After both Cloudflare Pages and Render are deployed:
1. Copy your Cloudflare Pages URL (e.g. `https://foodtrail.pages.dev` or your custom domain).
2. Copy your Render Admin Panel URL (e.g. `https://foodtrail-admin.onrender.com`).
3. Go to **Render Dashboard** $\rightarrow$ `foodtrail-backend` $\rightarrow$ **Environment**.
4. Configure the environment variables:
   - `FRONTEND_URL`: `https://foodtrail.pages.dev` *(supports comma-separated URLs if you have multiple domains)*
   - `ADMIN_FRONTEND_URL`: `https://foodtrail-admin.onrender.com`
   - `ALLOWED_ORIGINS`: *(Optional comma-separated list of any additional custom domains, e.g. `https://foodtrail.app`)*
5. Click **Save Changes** (Render will automatically redeploy the backend with the new whitelist).

---

## Step 5: Post-Deployment Smoke Test Checklist

- [ ] **Health Check**: Open `https://<backend-url>.onrender.com/health` $\rightarrow$ Returns `{"status":"ok"}`.
- [ ] **Frontend Home Page**: Open `https://<frontend-project>.pages.dev` $\rightarrow$ Spots and trails load correctly.
- [ ] **User Signup / OTP**: Test signup flow with an active email address $\rightarrow$ Receive 6-digit OTP via Brevo.
- [ ] **Photo Upload**: Upload a restaurant/dish photo $\rightarrow$ Image hosted on Cloudinary.
- [ ] **Admin Login**: Open `https://<admin-url>.onrender.com/login` $\rightarrow$ Login with `admin@foodtrail.com` and initial password.
- [ ] **PWA Offline Mode**: Install PWA on Chrome/iOS Safari $\rightarrow$ Verify offline spot discovery and offline sync queue.
