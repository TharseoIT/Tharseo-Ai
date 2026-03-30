from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from config import settings
from typing import List


class BaseAgent:
    """
    Base class for all Tharseo AI agents.
    Each agent has a name, a role (system prompt), and conversation memory.
    Think of it like hiring an employee — you tell them their job description once
    and they remember the whole conversation.
    """

    def __init__(self, name: str, system_prompt: str):
        self.name = name
        self.system_prompt = system_prompt
        self.memory: List = []  # Stores conversation history
        self.llm = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.model_name,
        )

    def chat(self, user_message: str) -> str:
        # Add user message to memory
        self.memory.append(HumanMessage(content=user_message))

        # Build full message list: system prompt + conversation history
        messages = [SystemMessage(content=self.system_prompt)] + self.memory

        # Call Groq API
        response = self.llm.invoke(messages)

        # Add AI response to memory so next message has full context
        self.memory.append(AIMessage(content=response.content))

        return response.content

    def clear_memory(self):
        """Reset conversation history — fresh start."""
        self.memory = []
