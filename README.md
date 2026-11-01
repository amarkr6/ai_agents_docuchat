# 📄 DocuChat AI — Chat with your documents

DocuChat AI is a ChatGPT-like web app. You upload PDFs or Word documents, ask questions in plain English, and the AI answers **using only your documents**, with numbered sources (file name + page) so you can check every answer.

This repository has three guides:

| File | For whom | What's inside |
|---|---|---|
| **README.md** (this file) | Everyone | What the app does, folder layout, how to set it up and run it, all commands |
| **[TECHNICAL_README.md](./TECHNICAL_README.md)** | Developers | Architecture, data flow, database design, API reference, design decisions |
| **[INTERVIEW_QA.md](./INTERVIEW_QA.md)** | You, before an interview | Questions and answers about RAG, this project's architecture and the code |

---

## ✨ What can it do?

| Feature | What it means for the user |
|---|---|
| Sign up / log in | Every user has a private account |
| Upload documents | PDF, Word (.docx), TXT or Markdown, up to 10 MB each |
| Ask questions | Type a question like in ChatGPT |
| Answers with sources | Every answer shows clickable badges like `[1]` linked to "Policy.pdf, page 3" |
| Honest "I don't know" | If the answer isn't in your documents, it says so instead of guessing |
| Chat history | Previous conversations are saved in the left sidebar |
| Sharing | Keep a document private, share it with specific people, or make it public |
| Roles | **Admin** manages users · **Editor** uploads & shares · **Viewer** can only ask questions |
| Rate answers | 👍 / 👎 on each answer |
| Metrics page | Response time, AI cost, answer quality and an accuracy test |
| Choice of AI | Google Gemini (free tier, default) or OpenAI (paid), switched with one setting |

---

## 📁 Folder structure

The project is **one repository with two separate apps** inside it: `backend` (the server) and `frontend` (the website). Each has its own `package.json` and its own packages. A small `package.json` at the top level gives you shortcut commands that run both together.

```
rag-doc-chat/
├── README.md               ← this file
├── TECHNICAL_README.md     ← developer documentation
├── INTERVIEW_QA.md         ← interview preparation
├── package.json            ← shortcut commands for both apps (install:all, dev, build…)
├── .gitignore              ← files Git must never save (.env, node_modules, dist)
├── .nvmrc                  ← required Node.js version (24)
│
├── backend/                ← the server (API) — Node.js + Express + TypeScript
│   ├── .env.example        ← template for secret settings (copy to .env)
│   ├── package.json
│   └── src/
│       ├── server.ts       ← starts the server
│       ├── app.ts          ← sets up Express
│       ├── config/         ← settings, database and AI connections
│       ├── models/         ← database collections (users, documents, chunks, chats, logs)
│       ├── routes/         ← list of API URLs
│       ├── controllers/    ← receive requests, send responses
│       ├── services/       ← the real work (AI, search, upload processing…)
│       ├── middleware/     ← checks that run before requests (login, roles, errors)
│       ├── validators/     ← rules for valid input
│       ├── utils/          ← small helpers (logger, cost calculator)
│       ├── types/          ← TypeScript type definitions
│       └── scripts/        ← one-time setup scripts (create the search index)
│
└── frontend/               ← the website — React + TypeScript + Tailwind CSS
    ├── .env.example
    ├── package.json
    ├── index.html
    └── src/
        ├── main.tsx        ← starts the React app
        ├── App.tsx         ← list of pages
        ├── pages/          ← Login, Register, Chat, Documents, Metrics, Admin
        ├── components/     ← reusable UI pieces (message bubble, share dialog…)
        ├── api/            ← functions that talk to the backend
        ├── context/        ← "who is logged in" state
        └── types/          ← TypeScript type definitions
```

---

## ✅ What you need before starting

| Tool | Why | Check |
|---|---|---|
| **Node.js 24** | Runs the backend and the build tools | `node --version` → `v24.x.x` |
| **npm 10+** | Installs packages (comes with Node.js) | `npm --version` |
| **Git** | Downloads and shares the code | `git --version` |
| **MongoDB Atlas account** (free) | Database + vector search | https://www.mongodb.com/cloud/atlas/register |
| **Google Gemini API key** (free) | The AI | https://aistudio.google.com/apikey |
| *(optional)* OpenAI API key | Paid alternative AI, min. $5 credit | https://platform.openai.com/api-keys |
| A code editor, e.g. **VS Code** | Editing `.env` and code | |

---

## 🖥️ First-time setup (the person who creates the project)

All commands below are for **Windows PowerShell / VS Code terminal**. macOS / Linux differences are noted where needed.

### Step 1 — Create the MongoDB Atlas database
1. Log in to Atlas → create a project → **Create** a cluster → choose **Free (M0)** → provider AWS, region **Mumbai (ap-south-1)** → **Create Deployment**.
2. Create a database user (username + autogenerated password). Use a password with only letters and numbers.
3. **Network Access** → *Add Current IP Address*.
4. **Connect** → **Drivers** → Node.js → copy the connection string.

### Step 2 — Get the Gemini key
https://aistudio.google.com/apikey → **Create API key** → **Copy key**.

### Step 3 — Create the settings files
```powershell
cd C:\node\ai\rag-doc-chat
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```
macOS / Linux: `cp backend/.env.example backend/.env` and `cp frontend/.env.example frontend/.env`

Open `backend\.env` and fill in:

| Setting | What to put |
|---|---|
| `MONGODB_URI` | Atlas connection string with your username and password (no `< >`) |
| `JWT_SECRET` | A long random text. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `AI_PROVIDER` | `gemini` (default, free) or `openai` |
| `GOOGLE_API_KEY` | Your Gemini key (when using Gemini) |
| `OPENAI_API_KEY` | Your OpenAI key (only when using OpenAI) |
| `DNS_SERVERS` | Keep `8.8.8.8,1.1.1.1` (fixes `querySrv ECONNREFUSED` on some home/office networks) |

Rules: one setting per line, no spaces around `=`, no quotes. `frontend\.env` needs no changes for local use.

### Step 4 — Install, create the index, run
```powershell
npm run install:all     # installs root + backend + frontend packages (2–3 min)
npm run create:index    # creates the vector search index in Atlas (wait ~1 min until READY)
npm run dev             # starts backend + frontend together
```
- Website → **http://localhost:5173**
- API → http://localhost:5000/api (health check: http://localhost:5000/api/health)

Press `Ctrl + C` to stop.

### Step 5 — Try it
1. Open http://localhost:5173 and **Sign up**. *The first account becomes **Admin** automatically.*
2. **Documents** → **Upload document** → choose a PDF with selectable text → wait until status is **ready**.
3. **Chat** → **+ New chat** → ask a question about the PDF.
4. **Metrics** → see response time, quality and cost.

---

## 🧑‍🤝‍🧑 Sharing the project with your team (Git + GitHub)

### A) Put the project on GitHub (do this once)
1. Create an **empty private repository** on GitHub, e.g. `rag-doc-chat` (don't add a README there).
2. In the project folder:
```powershell
cd C:\node\ai\rag-doc-chat
git init
git add .
git status              # CHECK: no ".env" and no "node_modules" in the list!
git commit -m "Initial commit: RAG document chat app"
git branch -M main
git remote add origin https://github.com/<your-username>/rag-doc-chat.git
git push -u origin main
```
> 🔒 `.gitignore` already keeps `.env`, `node_modules` and `dist` out of Git. **Never commit `.env`** — it contains your database password and API keys. If `git status` ever shows `.env`, stop and fix `.gitignore` first.

3. On GitHub → **Settings → Collaborators** → invite your team members.

### B) A new team member's setup (copy-paste checklist)
```powershell
# 1. Download the code
git clone https://github.com/<your-username>/rag-doc-chat.git
cd rag-doc-chat

# 2. Check versions (need Node 24)
node --version
npm --version

# 3. Install all packages
npm run install:all

# 4. Create your own settings files
copy backend\.env.example backend\.env        # macOS/Linux: cp backend/.env.example backend/.env
copy frontend\.env.example frontend\.env      # macOS/Linux: cp frontend/.env.example frontend/.env
#    -> fill in backend\.env (see the table in Step 3)

# 5. Only if using a NEW/EMPTY database: create the search index
npm run create:index

# 6. Start
npm run dev
```

**Where does each team member get the secret values?** `.env` is never in Git, so each person fills it in. Two common options:

| Option | How | Good for |
|---|---|---|
| **Shared dev database** | The project owner creates a separate Atlas database user for each teammate (Atlas → Database Access) and adds their IP (Network Access). The index already exists, so they **skip** `create:index`. | Teams that want to see the same documents |
| **Own database each** | Each teammate creates their own free Atlas cluster and runs `npm run create:index` once. | Fully independent work |

Each teammate should create **their own Gemini key** (it's free, and limits are per key). Share secrets only through a password manager or a private message, never in Git, screenshots or public chats.

### C) Daily team workflow
```powershell
git pull                        # get the latest code before you start
npm run install:all             # only if package.json changed in the pull
git checkout -b feature/my-change   # work on your own branch
# ... edit code ...
npm run typecheck --prefix backend  # check for TypeScript errors
npm run typecheck --prefix frontend
git add .
git commit -m "Short description of the change"
git push -u origin feature/my-change
# then open a Pull Request on GitHub for review
```

---

## 📋 All commands (cheat sheet)

Run these from the **project root** (`rag-doc-chat/`) unless noted.

| Command | What it does | When to use |
|---|---|---|
| `npm run install:all` | Installs packages for root, backend and frontend | After cloning, or after `package.json` changes |
| `npm run dev` | Starts backend (port 5000) + frontend (port 5173) together, with auto-reload | Daily development |
| `npm run create:index` | Creates / rebuilds the Atlas vector search index | First setup, new database, or after changing `AI_PROVIDER` |
| `npm run build` | Compiles backend to `backend/dist` and frontend to `frontend/dist` | Before deploying |
| `npm start` | Runs the compiled backend (after `npm run build`) | Production |
| `npm run dev --prefix backend` | Starts only the backend | Working on the API only |
| `npm run dev --prefix frontend` | Starts only the frontend | Working on the UI only |
| `npm run typecheck --prefix backend` | Checks backend TypeScript errors without building | Before committing |
| `npm run typecheck --prefix frontend` | Checks frontend TypeScript errors | Before committing |
| `npm run preview --prefix frontend` | Serves the built frontend locally | Checking the production build |
| `npm install <package> --prefix backend` | Adds a new package to the backend | Adding a dependency |
| `npm install <package> --prefix frontend` | Adds a new package to the frontend | Adding a dependency |
| `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` | Generates a random `JWT_SECRET` | Setup |

---

## 🔁 Switching the AI provider

In `backend\.env`:
```env
AI_PROVIDER=openai          # or gemini
OPENAI_API_KEY=sk-...       # the key for the chosen provider
```
Then:
```powershell
npm run create:index   # rebuilds the index (Gemini = 768 numbers per vector, OpenAI = 1536)
npm run dev
```
Documents uploaded with the old provider are marked *failed*; delete and re-upload them.

---

## 🌍 Run on a production server

**Option A — one Linux server / VPS (AWS EC2, DigitalOcean…)**
```bash
git clone https://github.com/<your-username>/rag-doc-chat.git && cd rag-doc-chat
cp backend/.env.example backend/.env     # fill in values; set NODE_ENV=production
                                         # and CLIENT_URL=https://your-domain.com
echo "VITE_API_URL=https://your-domain.com/api" > frontend/.env
npm run install:all
npm run build
npm run create:index                     # only the first time
npm install -g pm2
pm2 start backend/dist/server.js --name docuchat-api   # keeps the API running
pm2 save
```
Then point Nginx at `frontend/dist` for the website, forward `/api` to `http://localhost:5000`, and add HTTPS with Let's Encrypt (certbot).

**Option B — cloud hosting**
- **Backend** → Render or Railway: root directory `backend`, build `npm install && npm run build`, start `npm start`, add all `.env` values in the dashboard (`NODE_ENV=production`, `CLIENT_URL=<frontend URL>`).
- **Frontend** → Vercel or Netlify: root directory `frontend`, build `npm run build`, output `dist`, environment variable `VITE_API_URL=<backend URL>/api`, and a rewrite rule so every route serves `index.html`.
- In Atlas → **Network Access**, allow your host's IP addresses.

---

## 🛠️ Common problems

| Problem | Fix |
|---|---|
| `'tsx' is not recognized` | Packages aren't installed → `npm run install:all` |
| `❌ Invalid environment variables` | `backend\.env` is missing or a value is empty — see Step 3 |
| `querySrv ECONNREFUSED` | Your network blocks the Atlas DNS lookup → add `DNS_SERVERS=8.8.8.8,1.1.1.1` to `backend\.env` |
| `MongooseServerSelectionError` / timeout | Your IP isn't allowed in Atlas → Network Access, or the password in `MONGODB_URI` is wrong |
| `bad auth` / `authentication failed` | Wrong username or password in `MONGODB_URI` |
| `401 Incorrect API key` / `API key not valid` | Wrong AI key in `.env` (or OpenAI has no credit). Restart `npm run dev` after editing `.env` |
| `429` / `RESOURCE_EXHAUSTED` / slow answers | Gemini free-tier limit — wait a minute and retry |
| "You don't have any processed documents yet" | No document is **ready** — upload one and wait |
| Answers always say "couldn't find" | The vector index isn't READY, or wasn't created → `npm run create:index`, wait 1 min |
| `No readable text found` | The PDF is a scanned image. Use a PDF with selectable text |
| "AI provider changed" on documents | You switched provider — delete and re-upload |
| `npm run build` fails mentioning `openai.ts` | Delete the old file `backend\src\config\openai.ts` (replaced by `ai.ts`) |
| `Cannot reach the server` in the website | The backend isn't running — check the terminal |
| Port 5000 already in use | Change `PORT` in `backend\.env` and `target` in `frontend\vite.config.ts` |

---

## 💰 About cost
- **Gemini (default)** is free on Google's free tier, with per-minute limits. The Metrics page shows $0. On the free tier Google may use your data to improve its products, so don't upload private documents.
- **OpenAI** charges per use: a 50-page PDF costs a fraction of a cent to index, and each question about $0.001. Set a monthly budget in your OpenAI account.
