from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from agents.lead_agent import LeadAgent
from agents.cloud_agent import CloudAgent
from database import get_db, engine
from models import User, Message
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
    "lead":  LeadAgent(),
    "cloud": CloudAgent(),
}


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
    username: str   # Display name returned to frontend


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
    return TokenResponse(access_token=token, token_type="bearer", username=user.username)


@app.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": user.email})
    return TokenResponse(access_token=token, token_type="bearer", username=user.username)


# ── Chat routes ───────────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if request.agent not in agents:
        raise HTTPException(status_code=400, detail=f"Unknown agent '{request.agent}'")

    # Load this user's history for this agent from DB
    rows = (
        db.query(Message)
        .filter_by(user_id=current_user.id, agent_id=request.agent)
        .order_by(Message.created_at)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in rows]

    # Call the agent
    response_text = agents[request.agent].chat(request.message, history)

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
    db.query(Message).filter_by(user_id=current_user.id, agent_id=agent_name).delete()
    db.commit()
    return {"status": "cleared", "agent": agent_name}


# ── Misc routes ───────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Tharseo AI is running", "version": "0.2.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/agents")
def list_agents():
    return {
        "agents": [
            {"id": "lead",  "name": "Nexus", "description": "Strategic Operations"},
            {"id": "cloud", "name": "Terra", "description": "Cloud Infrastructure"},
        ]
    }


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
