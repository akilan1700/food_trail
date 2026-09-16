<!--
File: README.md
Description: FoodTrail project overview, setup guide, and documentation with brand logo.
Author: Akilan M
Updated: 2026-09-16
-->

<p align="center">
  <img src="./frontend/public/logo.svg" alt="FoodTrail logo" width="128" height="128" />
</p>

<h1 align="center">FoodTrail</h1>

<p align="center">
  <strong>Discover signature dishes &amp; curated walkable food trails near you</strong>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-ISC-blue.svg" alt="License: ISC" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/PWA-Installable-f18024" alt="PWA" />
</p>

<p align="center">
  Mobile-first food discovery PWA — search dishes, walk curated trails,<br />
  build your trip, and share routes with friends. Offline-friendly.
</p>

<p align="center">
  <a href="#-quick-start"><strong>Quick start</strong></a> ·
  <a href="#-features"><strong>Features</strong></a> ·
  <a href="#-tech-stack"><strong>Tech stack</strong></a> ·
  <a href="./DEPLOYMENT.md"><strong>Deploy</strong></a> ·
  <a href="./LICENSE"><strong>License</strong></a>
</p>

---

## Features

| | Feature | What you get |
|---|---------|--------------|
| 🍽️ | **Dish search** | Find signature dishes and nearby dining spots |
| 🚶 | **Walking trails** | Browse and follow curated walkable food routes |
| 🗺️ | **My Trip** | Save spots & trails into a personal walking itinerary |
| 📍 | **Add spot** | Pin new food spots with photos and details |
| 📤 | **Share** | Share trails and trips (WhatsApp-friendly links) |
| 📱 | **PWA** | Installable, offline-aware Progressive Web App |
| 🛡️ | **Admin panel** | Moderate spots, dishes, trails, and users |

---

## Tech stack

| Layer | Stack |
|-------|--------|
| **User app** | Next.js 16 · React 19 · TypeScript · Tailwind CSS · Redux Toolkit |
| **Admin app** | Next.js 16 · React 19 · TypeScript · Tailwind CSS |
| **API** | Node.js · Express · MongoDB (Mongoose) · JWT cookies |
| **Media** | Cloudinary |
| **Email** | Brevo (OTP / verification) |
| **Deploy** | Cloudflare Pages · Render · MongoDB Atlas |

---

## Architecture

```
┌──────────────────────────────────────────────┐
│           User Browser / PWA                 │
│              (frontend/)                     │
└──────────────────────┬───────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────┐      ┌─────────────────────┐
│           Backend API (Express)              │◄────┤   Admin Panel       │
│              (backend/)                      │      │  (admin-frontend/)  │
└──────┬───────────────┬────────────────┬──────┘      └─────────────────────┘
       │               │                │
       ▼               ▼                ▼
  MongoDB Atlas   Cloudinary CDN    Brevo Email
```

---

## Repository structure

```
food_trail/
├── frontend/          # User-facing PWA (Next.js)     → :3000
├── admin-frontend/    # Admin dashboard (Next.js)     → :3001
├── backend/           # REST API (Express + MongoDB)   → :5001
├── DEPLOYMENT.md      # Production deployment guide
├── render.yaml        # Render blueprint
├── LICENSE            # ISC License
└── README.md
```

| Path | Port | Role |
|------|------|------|
| `frontend/` | `3000` | User PWA — search, trails, trip, spots |
| `admin-frontend/` | `3001` | Admin dashboard |
| `backend/` | `5001` | REST API |

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- **MongoDB** locally, or a MongoDB Atlas URI
- Optional: Cloudinary + Brevo credentials (uploads & email OTP)

---

## Quick start

### 1. Clone

```bash
git clone https://github.com/akilan1700/food_trail.git
cd food_trail
```

### 2. Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp admin-frontend/.env.example admin-frontend/.env.local
```

Edit `backend/.env` and set at least:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random secret (required before real deploy) |
| `FRONTEND_URL` | User app origin (CORS / cookies) |
| `ADMIN_FRONTEND_URL` | Admin app origin |

Optional: Cloudinary and Brevo keys for uploads and email OTP.

### 3. Install & run

Open **three terminals**:

<details>
<summary><strong>Backend</strong> — port 5001</summary>

```bash
cd backend
npm install
npm run dev
```

</details>

<details>
<summary><strong>User frontend</strong> — port 3000</summary>

```bash
cd frontend
npm install
npm run dev
```

</details>

<details>
<summary><strong>Admin frontend</strong> — port 3001</summary>

```bash
cd admin-frontend
npm install
npm run dev
```

</details>

| App | URL |
|-----|-----|
| User PWA | [http://localhost:3000](http://localhost:3000) |
| Admin | [http://localhost:3001](http://localhost:3001) |
| API | [http://localhost:5001](http://localhost:5001) |

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | `development` / `production` |
| `PORT` | No | API port (default `5001`) |
| `MONGO_URI` | **Yes** | MongoDB connection URI |
| `JWT_SECRET` | **Yes** | Secret for signing auth cookies |
| `FRONTEND_URL` | **Yes** | User app origin (CORS / cookies) |
| `ADMIN_FRONTEND_URL` | **Yes** | Admin app origin |
| `ALLOWED_ORIGINS` | No | Extra comma-separated origins |
| `BREVO_API_KEY` | For email | Brevo API key |
| `BREVO_SENDER_EMAIL` | For email | Sender address |
| `BREVO_SENDER_NAME` | No | Sender display name |
| `CLOUDINARY_*` | For uploads | Cloud name, API key, API secret |

### Frontends

| Variable | Apps | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_API_URL` | `frontend`, `admin-frontend` | API base URL (e.g. `http://localhost:5001/api`) |

> **Security:** Never commit real secrets. Keep `.env` / `.env.local` out of git.

---

## Auth model

| Rule | Detail |
|------|--------|
| Sessions | HttpOnly cookies (`token` / `admin_token`) |
| Mutations | Create spot/dish/trail, upload, busy/photo updates require auth |
| Ownership | Spot photo / busy / update / delete → **owner or admin** |
| Admins | Not auto-seeded — create manually in MongoDB ([DEPLOYMENT.md](./DEPLOYMENT.md)) |

---

## Scripts

<table>
<tr>
<td width="50%" valign="top">

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | API with nodemon |
| `npm start` | Production API |
| `npm test` | Jest + coverage |

</td>
<td width="50%" valign="top">

### Frontend / Admin

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve build |
| `npm run lint` | ESLint |

</td>
</tr>
</table>

---

## Testing

```bash
cd backend
npm test
```

Update existing backend tests when changing covered behavior. Do not add new frontend/admin test files for routine feature work.

---

## Production deploy

Full runbook → **[DEPLOYMENT.md](./DEPLOYMENT.md)** · Blueprint → **[render.yaml](./render.yaml)**

| Service | Host |
|---------|------|
| User PWA | Cloudflare Pages |
| Backend API | Render Web Service |
| Admin panel | Render Static Site |
| Database | MongoDB Atlas |
| Media | Cloudinary |
| Email | Brevo |

Set a strong `JWT_SECRET` before any production deploy.

---

## Contributing

1. Follow existing folder layout and naming conventions  
2. Validate inputs; never log secrets or tokens  
3. Prefer small, focused changes  
4. Update backend Jest tests when API behavior changes  

---

## License

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-ISC-blue.svg" alt="License: ISC" /></a>
</p>

This project is licensed under the **[ISC License](./LICENSE)**.

```
Copyright (c) 2026 Akilan M
```

---

<p align="center">
  <img src="./frontend/public/logo.svg" alt="FoodTrail" width="48" height="48" />
  <br />
  <strong>FoodTrail</strong> · Walk. Eat. Discover.
  <br /><br />
  Built by <a href="https://github.com/akilan1700"><strong>Akilan M</strong></a>
</p>
