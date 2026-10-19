# ApplyPilot — job-search workspace

A React/Vite frontend and Node.js/Express/MongoDB API for a job-search workspace. This is an independent prototype, not affiliated with AutoApplyMax.

## Features implemented

- Email/password registration and login with bcrypt password hashing and JWT-protected API routes.
- MongoDB user profile with a saved resume text field and skills.
- Authenticated PDF/DOCX resume upload (8 MB limit), text extraction, profile persistence, and a clear/delete endpoint. Original files are processed in memory and are not stored on disk.
- Chrome Manifest V3 extension that syncs a profile, scans the active page only after a click, shows editable per-field suggestions, and fills only fields you select. It never submits forms.
- Per-user application tracker: create, list, read, update, delete, status, notes, job URL, and follow-up date; dashboard stats endpoint.
- AI resume tailoring against a supplied job description, grounded in the user's source resume.
- AI-assisted screening-question drafts. Unknown personal facts are marked for user confirmation rather than guessed.
- AI resume/job-description review with keyword gaps and improvements (advisory only, not a real ATS vendor score).
- Request validation, security headers, CORS allow-list, JSON body limits, and API/auth rate limits.

## Requirements

- Node.js 20+ (Node 22 LTS recommended)
- MongoDB local instance or MongoDB Atlas connection string
- An OpenAI API key for AI features

## Setup

### 1. Configure the API

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set `MONGODB_URI`, a random `JWT_SECRET` (at least 32 characters), `CLIENT_ORIGIN=http://localhost:5173`, and `OPENAI_API_KEY`. For the browser extension, set `EXTENSION_ORIGIN` to the exact `chrome-extension://<extension-id>` origin after loading it in Chrome, then restart the API. The configured model defaults to `gpt-5.5`; set `OPENAI_MODEL` to a model available to your API account if needed.

```bash
npm install
npm run dev
```

The API starts at `http://localhost:4000`. Health check: `http://localhost:4000/api/health`.

### 2. Run the frontend in another terminal

From the project root:

```bash
npm install
npm run dev
```

Vite serves the site at `http://localhost:5173`. Optional: create a root `.env` containing `VITE_API_BASE_URL=http://localhost:4000/api` if the API is hosted elsewhere.

## API overview

| Method | Endpoint | Auth | Purpose |
|---|---|---:|---|
| GET | `/api/health` | No | API and database health |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| GET | `/api/auth/me` | Yes | Current profile |
| PATCH | `/api/auth/me` | Yes | Update name, headline, resume text, skills |
| GET | `/api/applications` | Yes | List applications (`?status=Applied&q=developer`) |
| GET | `/api/applications/stats` | Yes | Pipeline metrics |
| POST | `/api/applications` | Yes | Create application |
| GET/PATCH/DELETE | `/api/applications/:id` | Yes | Read/update/delete own application |
| POST | `/api/ai/tailor-resume` | Yes | Tailor resume to a job description |
| POST | `/api/ai/ats-review` | Yes | Resume/job match review |
| POST | `/api/ai/screening-answers` | Yes | Draft application screening answers |
| POST | `/api/resume/upload` | Yes | Upload and parse PDF/DOCX (`multipart/form-data`, field `resume`, max 8 MB) |
| GET | `/api/resume/text` | Yes | Read saved extracted resume text |
| DELETE | `/api/resume` | Yes | Delete saved extracted resume text and upload metadata |

Protected endpoints expect `Authorization: Bearer <token>`. The frontend currently stores the JWT in localStorage for this prototype. For production, prefer secure, HttpOnly, SameSite cookies, add CSRF protections as appropriate, configure HTTPS, rotate secrets, and use a managed secret store.

## Example API requests

Register:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Example User","email":"user@example.com","password":"a-long-unique-password"}'
```

Create an application (replace TOKEN):

```bash
curl -X POST http://localhost:4000/api/applications \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer TOKEN' \
  -d '{"company":"Example Co","role":"MERN Developer","status":"Applied","location":"Remote"}'
```

## Important limitations / production checklist

- AI calls require your own `OPENAI_API_KEY` and incur provider usage costs. AI output must be reviewed; it can still be wrong. Resume tailoring prompts prohibit fabricated credentials and metrics, but the user remains responsible for accuracy.
- PDF/DOCX parsing extracts embedded text only. Scanned/image-only PDFs need OCR and are rejected when too little text can be extracted. The upload is processed in memory; only extracted text and a filename/timestamp are saved to MongoDB.
- The extension is a local unpacked prototype. It has no job-board-specific selectors, OCR, AI-generated field answers, automatic submission, or store publication. Some sites use custom React fields that may not accept programmatic input events; always inspect every filled value.
- Email reminders, billing, password reset, email verification, OAuth, audit logs, and account deletion are not included.
- JWT is stored in localStorage in the frontend prototype. Move to secure HttpOnly cookies before production.
- Before deploying, add automated tests, production logging/monitoring, backup/retention policy, privacy policy/consent for resume processing, and review applicable privacy laws.


## PDF/DOCX resume upload

After signing in, open the dashboard and choose **Upload resume (PDF/DOCX)** in the profile card. The API accepts one `.pdf` or `.docx` file up to 8 MB. Text is extracted using `pdf-parse` or Mammoth; the original upload is not written to disk. Review the extracted content before using it for AI features. Scanned PDFs need OCR, which is not bundled.

The upload endpoint is `POST /api/resume/upload` with `multipart/form-data` field name `resume`. It returns extracted text and updates the user's saved `resumeText`. `GET /api/resume/text` reads it, and `DELETE /api/resume` clears the stored text and upload metadata.

## Install the Chrome extension (developer mode)

1. Start the API and sign in to ApplyPilot in your browser.
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the project's `extension/` directory.
3. Copy the extension ID shown on its details card. Add `EXTENSION_ORIGIN=chrome-extension://YOUR_EXTENSION_ID` to `server/.env` and restart the API so CORS allows this extension origin.
4. In ApplyPilot, open browser developer tools on the app origin and run `localStorage.getItem('applypilot_token')`. Copy the returned token (without extra quotes) into the extension popup. This prototype uses a bearer token; treat it like a password.
5. In the extension popup, save the connection, then **Sync profile from ApplyPilot**.
6. Navigate to a job application page, click the extension icon, then **Scan current page & review**. Edit values and uncheck any field you do not want filled. Click **Fill selected fields**, inspect the page, and submit manually yourself.
7. Use **Clear local data** in the extension popup to remove the stored token/profile from the extension.

The extension uses Chrome Manifest V3 with `activeTab` and `scripting`, so page access is initiated by your explicit click instead of running on every website. See the official [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) and [message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) docs.

### Extension/API troubleshooting

- **CORS error:** verify `EXTENSION_ORIGIN` exactly matches the extension ID origin and restart the backend.
- **Unauthorized:** sign in again, copy a fresh token, and save it in the popup.
- **No fields matched:** labels vary between job sites; use clearly labelled fields and review the page manually. The extension intentionally skips unknown fields rather than guessing.
- **Production deployment:** use HTTPS, configure the extension's API host permissions for the deployed API, avoid localStorage bearer tokens in production, and implement short-lived/rotatable sessions and account security controls.
