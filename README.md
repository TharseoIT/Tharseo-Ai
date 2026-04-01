# Tharseo AI

Internal AI platform for Tharseo IT. Role-based agents with persistent memory and document RAG.
Live at **https://ai.tharseoit.com**

---

## Agents

| Agent | Role | Who |
|---|---|---|
| **Nexus** | Strategic Operations | Admin |
| **Terra** | Cloud Infrastructure (OCI/Terraform) | Admin |
| **Apex** | Executive Intelligence | CEO, Admin |
| **Forge** | Sales & Growth | VP Sales, CEO, CSO, Admin |
| **Sentinel** | Security & Compliance | CSO, CEO, VP Sales, Admin |

## Features
- Role-based access — each user sees only their agents
- Persistent chat history per user per agent
- Document RAG — upload PDF, DOCX, PPTX, TXT to personalize your agent
- Web search injection for Forge, Sentinel, and Terra
- Live OCI infrastructure context for Terra
- Mobile-friendly UI with collapsible sidebar
- 30-day JWT sessions with auto-refresh

## Stack
- **Backend**: Python / FastAPI / LangChain / Groq (Llama 3.3 70B)
- **Frontend**: React / Vite / Tailwind CSS
- **Database**: PostgreSQL
- **Embeddings**: sentence-transformers `all-MiniLM-L6-v2` (CPU, free)
- **Infra**: OCI VM.Standard.A1.Flex — 3 OCPU, 18GB RAM

## Deploy
```bash
./deploy.sh
```

## Access
Contact Antonio Martinez to request an account.
