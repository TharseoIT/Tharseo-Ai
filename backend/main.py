from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents.lead_agent import LeadAgent
from agents.cloud_agent import CloudAgent

app = FastAPI(title="Tharseo AI", version="0.1.0")

# CORS — allows the React frontend to talk to this backend
# Why needed: browsers block requests between different origins by default
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agents — one instance per agent type
# Each holds its own conversation memory
agents = {
    "lead": LeadAgent(),
    "cloud": CloudAgent(),
}


class ChatRequest(BaseModel):
    message: str
    agent: str = "lead"  # Default to lead agent


class ChatResponse(BaseModel):
    response: str
    agent: str


@app.get("/")
def root():
    return {"status": "Tharseo AI is running", "agents": list(agents.keys())}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if request.agent not in agents:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown agent '{request.agent}'. Available: {list(agents.keys())}"
        )

    agent = agents[request.agent]
    response = agent.chat(request.message)

    return ChatResponse(response=response, agent=request.agent)


@app.post("/chat/{agent_name}/clear")
def clear_memory(agent_name: str):
    """Reset an agent's conversation memory — fresh start."""
    if agent_name not in agents:
        raise HTTPException(status_code=400, detail=f"Unknown agent '{agent_name}'")

    agents[agent_name].clear_memory()
    return {"status": "memory cleared", "agent": agent_name}


@app.get("/agents")
def list_agents():
    return {
        "agents": [
            {"id": "lead", "name": "Tharseo Lead Agent", "description": "PM & strategic advisor"},
            {"id": "cloud", "name": "Tharseo Cloud Agent", "description": "OCI, Terraform & Terragrunt specialist"},
        ]
    }
