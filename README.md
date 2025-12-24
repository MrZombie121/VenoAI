c:\Users\User\Desktop\vENOi.png

# VenoAI

VenoAI is a 3D-styled chatbot web app with email OTP auth, VCoins balance, upgradeable plans, a mini-game, and local AI support (Ollama + fallback).

## Stack
- Frontend: Vite + React + TypeScript, Zustand state, custom glassmorphism styling.
- Backend: Node + Express + TypeScript, JWT auth, Brevo SMTP email OTP.
- Storage: Local JSON DB (`server/venodb.json`).
- AI: Ollama model (preferred) with Markov/knowledge fallback.

## Quick start
1. Install deps (run in project root):
   - `cd server && npm install`
   - `cd ../client && npm install`
2. Run backend:
   - `cd server && npm run dev` (defaults to http://localhost:4000)
3. Run frontend:
   - `cd client && npm run dev` (Vite on http://localhost:5173)
4. Demo creds: email `demo@veno.ai`, password `password123`.

## Features
- Login & registration with 6-digit email code confirmation (Brevo SMTP).
- Nickname support: login by email or nickname.
- Chats + single chat view with saved messages.
- VCoins wallet; buy Plus (1250) or Extended (5000) plans.
- Mini-game that rewards coins based on score.

## Notes
- Email is sent via Brevo SMTP (configure in `server/.env`).
- Data is stored in `server/venodb.json`.
- Ollama is used when available; otherwise fallback replies are used.

## Local AI training (optional)
You can train a tiny Markov model from your own text and let the app use it for replies.

1. Put text in a file, for example `server/data/train.txt`
2. Run: `cd server && npm run train:markov -- --input data/train.txt --lang ru`
3. The model is saved to `server/markov.model.json`
4. A knowledge file is saved to `server/knowledge.corpus.json`

## Environment
Server (`server/.env`):
- `BREVO_SMTP_USER`, `BREVO_SMTP_PASS`, `EMAIL_FROM`
- `JWT_SECRET`, `PORT`
- `AI_MODEL_PATH` (optional, default `markov.model.json`)
- `AI_KNOWLEDGE_PATH` (optional, default `knowledge.corpus.json`)
- `OLLAMA_URL` (optional, default `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (example `Llama3.1-8b:latest`)

Client (optional, `client/.env`):
- `VITE_API_URL` (use full server URL in production, e.g. `https://your-render-service.onrender.com/api`)

## Deploy
Vercel (client):
1. Import the repo and set Root Directory to `client`.
2. Add `VITE_API_URL` in Vercel env vars.
3. Build command: `npm run build` (default), Output: `dist`.

Render (server):
1. Create a new Web Service from the repo, Root Directory `server`.
2. Build: `npm install && npm run build`
3. Start: `npm run start`
4. Set env vars (`BREVO_SMTP_USER`, `BREVO_SMTP_PASS`, `EMAIL_FROM`, `JWT_SECRET`, `PORT`).
