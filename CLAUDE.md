# Tharseo AI — CLAUDE.md

## What This Is
Tharseo AI is an internal company LLM platform for Tharseo IT. Inspired by Leidos's internal "Violet" LLM.
5 role-based agents, persistent RAG knowledge base, mobile-friendly UI, live at `https://ai.tharseoit.com`.

## Agents
| ID | Name | Role | Search | Access |
|---|---|---|---|---|
| `lead` | Nexus | Strategic Operations | — | admin |
| `cloud` | Terra | Cloud Infrastructure + OCI | DuckDuckGo | admin |
| `executive` | Apex | Executive Intelligence | — | executive, admin |
| `sales` | Forge | Sales & Growth | DuckDuckGo | sales, executive, admin |
| `security` | Sentinel | Security & Compliance | DuckDuckGo | security, executive, admin |

## Team Access
| User | Email | Role |
|---|---|---|
| Antonio Martinez | amartinez@tharseoit.com | admin |
| Casey Carter | ccarter@tharseoit.com | admin |
| Eric Wimer (CEO) | ewimer@tharseoit.com | executive |
| Mike Tenreiro (VP Sales) | mtenreiro@tharseoit.com | sales |
| Bill Young (CSO) | wyoung@tharseoit.com | security |

## Architecture
- **Backend**: FastAPI + LangChain + Groq (`llama-3.3-70b-versatile`)
- **Frontend**: Vite + React + Tailwind CSS — mobile responsive, hamburger sidebar
- **Database**: PostgreSQL — chat history, users, documents, chunks
- **Auth**: JWT (30-day tokens, auto-refresh every 12h), `passlib[bcrypt]`
- **RAG**: sentence-transformers `all-MiniLM-L6-v2` (384-dim), numpy cosine similarity, JSON-serialized embeddings in Postgres Text column (pgvector avoided — server runs PG10.23, pgvector requires PG12+)
- **Search**: Pre-injection pattern into system prompt (NOT bind_tools — Groq/Llama 3.3 70B function calling is broken)
- **Agents**: Stateless — DB history injected per request

## Key Files
```
backend/
  main.py           — All routes: auth, chat, documents, Teams webhook
  config.py         — pydantic-settings (jwt_expire_minutes=43200 = 30 days)
  auth.py           — JWT create/verify, get_current_user (looks up by email)
  models.py         — User, Message, Document, DocumentChunk
  database.py       — SQLAlchemy engine, get_db()
  agents/
    base_agent.py   — BaseAgent: chat(), _retrieve_rag_context(), _should_search()
    lead_agent.py   — Nexus
    cloud_agent.py  — Terra + OCIContextTool
    executive_agent.py — Apex
    sales_agent.py  — Forge + DuckDuckGo
    security_agent.py  — Sentinel + DuckDuckGo
  rag/
    extractor.py    — PDF/DOCX/PPTX/TXT text extraction
    chunker.py      — Paragraph-aware chunking (500 chars, 100 overlap)
    embedder.py     — SentenceTransformer singleton, returns JSON-serialized vectors
  tools/
    oci_tools.py    — OCIContextTool: instance principal auth, fetches instances + VCNs

frontend/
  src/
    App.jsx         — Main UI: sidebar, agent switching, chat, RAG upload, change password
    Login.jsx       — Email login, session-expired banner
  .env.production   — VITE_API_URL=https://ai.tharseoit.com

deploy.sh           — git push + SSH pull + npm build + systemctl restart
infra/              — Terraform for OCI instance
```

## Server
- **IP**: `129.213.95.95` (VM.Standard.A1.Flex, 3 OCPU, 18GB RAM, Oracle Linux 8, ARM/aarch64)
- **SSH**: `ssh -i ~/Downloads/ssh-key-2026-03-09.key opc@129.213.95.95`
- **URL**: `https://ai.tharseoit.com` (nginx reverse proxy + Let's Encrypt)
- **Backend**: port 8000 (`tharseo-backend.service`)
- **Frontend**: port 3000 (`tharseo-frontend.service`)
- **App user**: `tharseo` — code at `/home/tharseo/Tharseo-Ai`
- **Venv**: `/home/tharseo/venv/`
- **Env file**: `/etc/tharseo-backend.env`

## Environment Variables (Server)
```
GROQ_API_KEY=...
DATABASE_URL=postgresql://tharseo:tharseo_ai_2026@localhost/tharseo_ai
JWT_SECRET=...
ADMIN_SECRET=...            # Required to create new accounts
REGISTRATION_OPEN=false
TEAMS_WEBHOOK_SECRET=...    # Empty — Teams integration on hold
```

## Deploy
```bash
./deploy.sh
```
Runs: `git add -A && git commit && git push`, then SSH pull + `npm run build` + restart both services.

## Groq / LLM Quirks
- `bind_tools` / function calling does NOT work with Llama 3.3 70B — outputs malformed JSON. Use pre-injection pattern.
- Pin `groq==0.13.0` + `httpx<0.28.0` — httpx 0.28+ removed the `proxies` kwarg that groq passes internally, causing a TypeError on startup
- Pin `bcrypt==4.2.1` (5.0.0 raises ValueError with passlib)
- Embeddings model `all-MiniLM-L6-v2` is pre-downloaded at `/home/tharseo/.cache/huggingface/`

## Security Status
- **Currently public-facing** — `https://ai.tharseoit.com` is open to the internet
- Registration is closed (admin_secret required), but the surface area is still exposed
- **Planned fix**: Lock OCI NSG to team IPs only, or migrate to Teams internal app with Azure AD SSO
- Long-term: full Microsoft 365 internal app — Teams tab + Azure AD auth, shut down public URL

## Roadmap / Pending

### Immediate
- [ ] **Lock down public access** — OCI NSG IP whitelist or move behind Azure AD
- [ ] **Get team uploading docs** — manually upload Tharseo proposals, SOPs, service catalog to RAG

### Waiting on Casey (Azure App Registration)
- [ ] **SharePoint RAG sync** — dedicated "Tharseo AI Knowledge Base" SharePoint site, `Sites.Selected` permission only
- [ ] **Microsoft Graph Search** — real-time search across M365 content injected as RAG context
- [ ] **Internal Teams app** — app manifest + Azure AD SSO, replaces public web app

### Phase 2 (Self-hosted)
- [ ] **TurboQuant + llama.cpp** — tracking PRs #21089, #21038, Issue #20977. ~6x memory reduction would make Llama 3.3 70B feasible on 18GB RAM
- [ ] **Hermes (NousResearch)** — better tool use / function calling, fixes the bind_tools limitation
- [ ] **Better web search** — swap DuckDuckGo for Tavily or Brave Search API

## Brand Colors
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
- **Dynamic group**: `tharseo-ai-instance` — instance principal auth for OCI SDK in Terra

## Local Dev
```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm run dev
```
Backend needs `.env` locally with `GROQ_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SECRET`.
