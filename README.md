# 🔐 SecureShare — MERN Secure File Sharing System

Upload files, share them through unique links with expiry, recipient restrictions, passwords and download limits, revoke access any time, and track who downloaded what.

## Stack
- **MongoDB + Mongoose**, **Express 5**, **React 18 (Vite)**, **Node 18+**
- JWT auth (bcrypt-hashed passwords), Multer uploads, AES-256-GCM encryption at rest

## Quick start
```bash
# 1. Backend
cd server
cp .env.example .env        # then fill in ENC_KEY and JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # paste output as ENC_KEY
npm install
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173  (proxies /api to :5000)
```
MongoDB must be running locally (or set `MONGO_URI` to an Atlas URL).

> Keep `ENC_KEY` safe and never change it — files encrypted with a lost/changed key cannot be recovered.

## Requirement coverage
| Requirement | Where |
|---|---|
| Registration & login | `routes/auth.js`, `pages/AuthPage.jsx` |
| Upload / download | `routes/files.js`, `pages/Files.jsx` |
| Unique sharing link + code | 12-char random code (`crypto.randomBytes`), `routes/shares.js` |
| Expiry time | Presets from 15 min to 30 days (API accepts 1 min–90 days) |
| Restrict to selected users | `allowedEmails`; recipient must be logged in with a matching email |
| Revoke access | `POST /api/shares/:id/revoke`, button in Shared History |
| History of shared files | Shared History page |
| Status active / expired / revoked | Computed server-side by `shareStatus()` |
| Search & filter | By file name, code, recipient email; filter by status |
| Download tracking | `Download` model: user, email, IP, time — shown in the "Log" row |
| **Bonus** password links | bcrypt-hashed link password |
| **Bonus** download limits | Atomic counter (race-safe); limit 1 = one-time link |
| **Bonus** encryption | AES-256-GCM, unique IV per file, streamed |
| **Bonus** notifications | In-app bell: when a link is opened and when a file is downloaded |
| **Bonus** temporary links | Short expiry presets (15 min) + one-time option |
| **Bonus** dashboard | Storage usage bar, share status counts, downloads per day, recent activity |

## API
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Auth |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/files` | List / upload (multipart `file`) |
| GET/DELETE | `/api/files/:id[/download]` | Owner download / delete (revokes shares) |
| POST | `/api/shares` | Create share `{fileId, expiresInMinutes, allowedEmails, password, maxDownloads}` |
| GET | `/api/shares?q=&status=` | History with search/filter |
| POST | `/api/shares/:id/revoke` | Revoke |
| GET | `/api/shares/:id/downloads` | Download log |
| GET | `/api/s/:code` | Link info (login required) |
| POST | `/api/s/:code/download` | Download `{password?}` |
| GET | `/api/dashboard` | Stats |
| GET/POST | `/api/notifications[/read]` | Notifications |

## Design notes
- Recipients must log in, so every download is attributed to a user and time.
- Expiry and revocation are enforced on every request (no cron needed); download limits use an atomic `findOneAndUpdate`.
- Deleting a file removes the encrypted blob and revokes its shares; share history is kept.
- Config: `STORAGE_QUOTA_MB` (per user) and `MAX_FILE_MB` in `server/.env`.

## Ideas to extend
Email notifications (nodemailer), rate limiting (`express-rate-limit`), S3 storage, refresh tokens, virus scanning.
