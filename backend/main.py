from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from agents.lead_agent import LeadAgent
from agents.cloud_agent import CloudAgent
from database import get_db, engine
from models import User, Message
import models
from auth import hash_password, verify_password, create_access_token, get_current_user

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
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str


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
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = User(username=request.username, password_hash=hash_password(request.password))
    db.add(user)
    db.commit()

    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token, token_type="bearer", username=user.username)


@app.post("/auth/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = create_access_token({"sub": user.username})
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
