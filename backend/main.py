from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from pathlib import Path
import os
import tempfile
from agents.lead_agent import LeadAgent
from agents.cloud_agent import CloudAgent
from agents.executive_agent import ExecutiveAgent
from agents.sales_agent import SalesAgent
from agents.security_agent import SecurityAgent
from database import get_db, engine
from models import User, Message, Document, DocumentChunk
from rag.extractor import extract_text, ALLOWED_EXTENSIONS
from rag.chunker import chunk_text
from rag.embedder import embed_texts, embed_query
import models
import hmac
import hashlib
import base64
import re
from auth import hash_password, verify_password, create_access_token, get_current_user
from config import settings

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tharseo AI", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

agents = {
    "lead":      LeadAgent(),
    "cloud":     CloudAgent(),
    "executive": ExecutiveAgent(),
    "sales":     SalesAgent(),
    "security":  SecurityAgent(),
}

ROLE_AGENTS: dict[str, list[str]] = {
    "admin":     ["lead", "cloud", "executive", "sales", "security"],
    "executive": ["lead", "executive", "sales", "security"],
    "sales":     ["lead", "executive", "sales", "security"],
    "security":  ["lead", "executive", "sales", "security"],
}


def check_agent_access(user: User, agent_id: str):
    allowed = ROLE_AGENTS.get(user.user_role, [])
    if agent_id not in allowed:
        raise HTTPException(status_code=403, detail="You do not have access to this agent.")


# ── Auth schemas ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str       # Display name e.g. "Casey Carter"
    email: str      # Login identifier
    password: str
    admin_secret: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    user_role: str


class UserMeResponse(BaseModel):
    username: str
    email: str
    user_role: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Chat schemas ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    agent: str = "lead"


class ChatResponse(BaseModel):
    response: str
    agent: str


class MessageOut(BaseModel):
    role: str
    content: str
    ts: str


class DocumentOut(BaseModel):
    id: int
    filename: str
    file_type: str
    chunk_count: int
    created_at: str


# ── Auth routes ───────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Registration is closed unless admin_secret is provided or registration_open is True
    if not settings.registration_open:
        if not settings.admin_secret or request.admin_secret != settings.admin_secret:
            raise HTTPException(status_code=403, detail="Registration is closed. Contact your administrator.")

    if db.query(User).filter(User.email == request.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = User(username=request.name, email=request.email.lower(), password_hash=hash_password(request.password))
    db.add(user)
    db.commit()

    token = create_access_token({"sub": user.email})
    return TokenResponse(access_token=token, token_type="bearer", username=user.username, user_role=user.user_role)


@app.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": user.email})
    return TokenResponse(access_token=token, token_type="bearer", username=user.username, user_role=user.user_role)


@app.get("/auth/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserMeResponse(username=current_user.username, email=current_user.email, user_role=current_user.user_role)


@app.post("/auth/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.password_hash = hash_password(request.new_password)
    db.commit()
    return {"status": "password updated"}


# ── Chat routes ───────────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if request.agent not in agents:
        raise HTTPException(status_code=400, detail=f"Unknown agent '{request.agent}'")
    check_agent_access(current_user, request.agent)

    # Load this user's history for this agent from DB
    rows = (
        db.query(Message)
        .filter_by(user_id=current_user.id, agent_id=request.agent)
        .order_by(Message.created_at)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in rows]

    # Call the agent (pass db + user_id for RAG retrieval)
    response_text = agents[request.agent].chat(request.message, history, db=db, user_id=current_user.id)

    # Persist both messages
    db.add(Message(user_id=current_user.id, agent_id=request.agent, role="user", content=request.message))
    db.add(Message(user_id=current_user.id, agent_id=request.agent, role="ai",   content=response_text))
    db.commit()

    return ChatResponse(response=response_text, agent=request.agent)


@app.get("/conversations/{agent_name}", response_model=list[MessageOut])
def get_conversation(
    agent_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_agent_access(current_user, agent_name)
    rows = (
        db.query(Message)
        .filter_by(user_id=current_user.id, agent_id=agent_name)
        .order_by(Message.created_at)
        .all()
    )
    return [MessageOut(role=m.role, content=m.content, ts=m.created_at.isoformat()) for m in rows]


@app.post("/chat/{agent_name}/clear")
def clear_memory(
    agent_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_agent_access(current_user, agent_name)
    db.query(Message).filter_by(user_id=current_user.id, agent_id=agent_name).delete()
    db.commit()
    return {"status": "cleared", "agent": agent_name}


# ── Document / RAG routes ─────────────────────────────────────────────────────

@app.post("/documents/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Supported: {list(ALLOWED_EXTENSIONS.keys())}"
        )
    file_type = ALLOWED_EXTENSIONS[suffix]

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = Path(tmp.name)
        tmp.write(await file.read())

    try:
        raw_text = extract_text(tmp_path, file_type)
        if not raw_text.strip():
            raise HTTPException(status_code=422, detail="No text could be extracted from this file.")

        chunks = chunk_text(raw_text)
        if not chunks:
            raise HTTPException(status_code=422, detail="Document produced no usable chunks.")

        vectors = embed_texts(chunks)

        doc = Document(
            user_id=current_user.id,
            filename=file.filename,
            file_type=file_type,
            chunk_count=len(chunks),
        )
        db.add(doc)
        db.flush()  # get doc.id before committing

        for i, (text, vector) in enumerate(zip(chunks, vectors)):
            db.add(DocumentChunk(
                document_id=doc.id,
                user_id=current_user.id,
                chunk_index=i,
                content=text,
                embedding=vector,
            ))

        db.commit()
        db.refresh(doc)
    finally:
        os.unlink(tmp_path)

    return DocumentOut(
        id=doc.id,
        filename=doc.filename,
        file_type=doc.file_type,
        chunk_count=doc.chunk_count,
        created_at=doc.created_at.isoformat(),
    )


@app.get("/documents", response_model=list[DocumentOut])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    docs = (
        db.query(Document)
        .filter_by(user_id=current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [
        DocumentOut(id=d.id, filename=d.filename, file_type=d.file_type,
                    chunk_count=d.chunk_count, created_at=d.created_at.isoformat())
        for d in docs
    ]


@app.delete("/documents/{doc_id}")
def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter_by(id=doc_id, user_id=current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    db.delete(doc)
    db.commit()
    return {"status": "deleted", "id": doc_id}


# ── Misc routes ───────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Tharseo AI is running", "version": "0.2.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/agents")
def list_agents(current_user: User = Depends(get_current_user)):
    all_agents = [
        {"id": "lead",      "name": "Nexus",    "description": "Strategic Operations"},
        {"id": "cloud",     "name": "Terra",    "description": "Cloud Infrastructure"},
        {"id": "executive", "name": "Apex",     "description": "Executive Intelligence"},
        {"id": "sales",     "name": "Forge",    "description": "Sales & Growth"},
        {"id": "security",  "name": "Sentinel", "description": "Security & Compliance"},
    ]
    allowed = ROLE_AGENTS.get(current_user.user_role, [])
    return {"agents": [a for a in all_agents if a["id"] in allowed]}


# ── Teams Webhook ─────────────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    """Remove HTML tags that Teams includes in messages."""
    return re.sub(r"<[^>]+>", "", text).strip()


def verify_teams_hmac(body: bytes, auth_header: str, secret: str) -> bool:
    """Verify the HMAC-SHA256 signature Teams sends with each request."""
    try:
        mac = hmac.new(base64.b64decode(secret), body, hashlib.sha256)
        expected = "HMAC " + base64.b64encode(mac.digest()).decode()
        return hmac.compare_digest(expected, auth_header)
    except Exception:
        return False


def get_or_create_teams_user(db: Session) -> User:
    """Single shared user for all Teams bot messages."""
    user = db.query(User).filter(User.username == "teams_bot").first()
    if not user:
        from auth import hash_password
        user = User(username="teams_bot", password_hash=hash_password("teams_internal"))
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@app.post("/teams/webhook")
async def teams_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()

    # Verify HMAC if secret is configured
    if settings.teams_webhook_secret:
        auth_header = request.headers.get("Authorization", "")
        if not verify_teams_hmac(body, auth_header, settings.teams_webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid Teams HMAC signature")

    payload = await request.json() if not body else __import__("json").loads(body)
    raw_text = strip_html(payload.get("text", ""))

    if not raw_text:
        return {"type": "message", "text": "I didn't catch that — try mentioning me with a question."}

    # Route: @Terra → cloud agent, everything else → Nexus
    if re.search(r"@terra", raw_text, re.IGNORECASE):
        agent_id = "cloud"
    else:
        agent_id = "lead"

    # Strip the @mention from the message
    clean_text = re.sub(r"@(nexus|terra)\s*", "", raw_text, flags=re.IGNORECASE).strip()
    if not clean_text:
        agent_name = "Terra" if agent_id == "cloud" else "Nexus"
        return {"type": "message", "text": f"Hi! I'm {agent_name}. Ask me anything."}

    # Load Teams conversation history and respond
    teams_user = get_or_create_teams_user(db)
    rows = (
        db.query(Message)
        .filter_by(user_id=teams_user.id, agent_id=agent_id)
        .order_by(Message.created_at)
        .limit(20)  # Keep last 20 messages for context
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in rows]
    response_text = agents[agent_id].chat(clean_text, history)

    # Persist to DB
    db.add(Message(user_id=teams_user.id, agent_id=agent_id, role="user", content=clean_text))
    db.add(Message(user_id=teams_user.id, agent_id=agent_id, role="ai", content=response_text))
    db.commit()

    return {"type": "message", "text": response_text}
