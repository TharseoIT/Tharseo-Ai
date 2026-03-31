from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from config import settings
from typing import List, Optional


class BaseAgent:
    """
    Base class for all Tharseo AI agents.
    Stateless — history is passed in per request from the database.
    Supports optional search tool via context injection.
    """

    def __init__(self, name: str, system_prompt: str, search_tool=None):
        self.name = name
        self.system_prompt = system_prompt
        self.search_tool = search_tool
        self.llm = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.llm_model,
        )

    def _should_search(self, message: str) -> bool:
        """Detect if the question likely needs live/current information."""
        triggers = [
            "latest", "current", "today", "recent", "now", "price", "pricing",
            "cost", "2024", "2025", "2026", "new version", "release", "update",
            "search", "look up", "find", "what is the", "how much", "available",
        ]
        lower = message.lower()
        return any(t in lower for t in triggers)

    def chat(self, user_message: str, history: List) -> str:
        """
        history: list of dicts [{"role": "user"|"ai", "content": "..."}]
        """
        lc_history = []
        for msg in history:
            if msg["role"] == "user":
                lc_history.append(HumanMessage(content=msg["content"]))
            else:
                lc_history.append(AIMessage(content=msg["content"]))

        # Inject search results into system prompt if tool available and needed
        system = self.system_prompt
        if self.search_tool and self._should_search(user_message):
            try:
                results = self.search_tool.run(user_message)
                system += f"\n\n---\nLive web search results (use these to supplement your answer):\n{results}\n---"
            except Exception:
                pass  # Search failure is non-fatal — answer from training data

        messages = [SystemMessage(content=system)] + lc_history + [HumanMessage(content=user_message)]
        response = self.llm.invoke(messages)
        return response.content
