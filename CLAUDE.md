# Tharseo AI — CLAUDE.md

## What This Is
Tharseo AI is an internal company LLM platform for Tharseo IT. Inspired by Leidos's internal "Violet" LLM. Two agents in production:
- **Nexus** (`lead`) — Strategic Operations, project management, Tharseo context
- **Terra** (`cloud`) — Cloud Infrastructure specialist: OCI, Terraform, Terragrunt

## Architecture
- **Backend**: FastAPI + LangChain + Groq (Llama 3.3 70B via `llama-3.3-70b-versatile`)
- **Frontend**: Vite + React + Tailwind CSS
- **Database**: PostgreSQL — persistent per-user, per-agent chat history
- **Auth**: JWT via `python-jose`, passwords via `passlib[bcrypt]`
- **Search**: Terra uses DuckDuckGo (`langchain-community` `DuckDuckGoSearchRun`) — pre-search injection into system prompt (NOT bind_tools — Groq's function calling is incompatible with Llama 3.3 70B)
- **Agents**: Stateless — history loaded from DB per request, not stored in memory

## Server
- **IP**: `129.213.95.95` (VM.Standard.A1.Flex, 3 OCPU, 18GB RAM, Oracle Linux 8, ARM/aarch64)
- **SSH**: `ssh -i ~/Downloads/ssh-key-2026-03-09.key opc@129.213.95.95`
- **Backend**: http://129.213.95.95:8000 (systemd: `tharseo-backend.service`)
- **Frontend**: http://129.213.95.95:3000 (systemd: `tharseo-frontend.service`)
- **App user**: `tharseo` — all app code runs here, at `/home/tharseo/Tharseo-Ai`
- **Admin user**: `opc` — for SSH and sudo

## Key Files
```
backend/
  main.py           — FastAPI app, all routes (auth, chat, Teams webhook)
  config.py         — pydantic-settings, reads from /etc/tharseo-backend.env on server
  database.py       — SQLAlchemy engine, SessionLocal, get_db()
  models.py         — User, Message tables
  auth.py           — hash_password, verify_password, create_access_token, get_current_user
  agents/
    base_agent.py   — BaseAgent: stateless chat(), _should_search(), search injection
    lead_agent.py   — Nexus (Strategic Operations)
    cloud_agent.py  — Terra (Cloud Infrastructure) — has DuckDuckGo search tool
  requirements.txt

frontend/
  src/
    App.jsx         — Main chat UI with agent switching, history, markdown rendering
    Login.jsx       — Login/Register screen, JWT stored in localStorage
  public/
    tharseo-logo.svg
  tailwind.config.js  — Tharseo brand colors

deploy.sh           — One-command deploy: git push + SSH pull + npm build + systemctl restart
infra/              — Terraform for the OCI instance itself
```

## Environment (Server)
Env file: `/etc/tharseo-backend.env` (readable by systemd, not world-readable)
```
GROQ_API_KEY=...
DATABASE_URL=postgresql://tharseo:tharseo_ai_2026@localhost/tharseo_ai
JWT_SECRET=...
TEAMS_WEBHOOK_SECRET=...  # empty until Teams HTTPS is set up
```

## Deploy
```bash
./deploy.sh
```
This does: `git add -A && git commit && git push`, then SSHs to server, pulls, `npm build`, restarts both services.

## Known Issues / Pending
1. **Teams HTTPS**: `/teams/webhook` is built and working. Teams requires HTTPS. Need:
   - DNS A record: `ai.tharseoit.com → 129.213.95.95` (Casey or Erick has domain access)
   - nginx reverse proxy + Let's Encrypt SSL on server
   - Then register outgoing webhook in Teams with `https://ai.tharseoit.com/teams/webhook`

2. **OCI tools for Terra**: `list_oci_instances` and `list_oci_vcns` are defined in `cloud_agent.py` but NOT wired up. Groq's `bind_tools` fails with Llama 3.3 70B (malformed function call format). Fix options:
   - Pre-execute OCI queries and inject into context (same pattern as web search)
   - Switch to a model that handles tool calling better (Claude via API?)

3. **Nexus knowledge base**: Nexus has no project-specific knowledge. Future: feed Tharseo docs via RAG (pgvector + LlamaIndex).

4. **Phase 2 — Self-hosted**: Plan to self-host Llama 3.3 70B via vLLM/Ollama when TurboQuant lands in llama.cpp (tracking PRs #21089, #21038, Issue #20977). 6x memory reduction would make it feasible on current hardware.

## Tharseo Brand Colors
```
Green:  #95B552
Yellow: #EFED32
Blue:   #345C72
Teal:   #175873
Gray:   #595959
```

## OCI Context
- **Tenancy**: `tharseodemo` (us-ashburn-1)
- **Compartment**: `customer_Demos`
- **Compartment OCID**: `ocid1.compartment.oc1..aaaaaaaadan5k7a3kveubivd2rdp7ttxukvz3mp7qmbxg5ddpgeolyifhedq`

## Groq Quirks
- Model: `llama-3.3-70b-versatile`
- `bind_tools` / function calling does NOT work — outputs malformed JSON. Use pre-search injection pattern instead.
- Pin `groq==0.13.0` (0.11.0 has httpx proxies TypeError)
- Pin `bcrypt==4.2.1` (5.0.0 raises ValueError about 72-byte limit with passlib)

## Local Dev
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

cd frontend
npm run dev
```
Backend needs `.env` file locally with `GROQ_API_KEY`, `DATABASE_URL`, etc.
