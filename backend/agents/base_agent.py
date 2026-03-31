from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from config import settings
from typing import List


class BaseAgent:
    """
    Base class for all Tharseo AI agents.
    Stateless — conversation history is passed in per request from the database.
    """

    def __init__(self, name: str, system_prompt: str):
        self.name = name
        self.system_prompt = system_prompt
        self.llm = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.llm_model,
        )

    def chat(self, user_message: str, history: List) -> str:
        """
        history: list of dicts [{"role": "user"|"ai", "content": "..."}]
        loaded from the database by the caller.
        """
        lc_history = []
        for msg in history:
            if msg["role"] == "user":
                lc_history.append(HumanMessage(content=msg["content"]))
            else:
                lc_history.append(AIMessage(content=msg["content"]))

        messages = [SystemMessage(content=self.system_prompt)] + lc_history + [HumanMessage(content=user_message)]
        response = self.llm.invoke(messages)
        return response.content
