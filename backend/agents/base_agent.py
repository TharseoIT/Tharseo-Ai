from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from config import settings
from typing import List


class BaseAgent:
    """
    Base class for all Tharseo AI agents.
    Stateless — history is passed in per request from the database.
    Supports optional tools via LangChain tool calling.
    """

    def __init__(self, name: str, system_prompt: str, tools: List = None):
        self.name = name
        self.system_prompt = system_prompt
        self.tools = tools or []
        self.llm = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.llm_model,
        )
        # Bind tools to LLM if any provided
        self.llm_with_tools = self.llm.bind_tools(self.tools) if self.tools else self.llm

    def chat(self, user_message: str, history: List) -> str:
        """
        history: list of dicts [{"role": "user"|"ai", "content": "..."}]
        Runs an agentic tool-calling loop if tools are available.
        """
        lc_history = []
        for msg in history:
            if msg["role"] == "user":
                lc_history.append(HumanMessage(content=msg["content"]))
            else:
                lc_history.append(AIMessage(content=msg["content"]))

        messages = [SystemMessage(content=self.system_prompt)] + lc_history + [HumanMessage(content=user_message)]

        if not self.tools:
            response = self.llm.invoke(messages)
            return response.content

        # Agentic loop — agent can call tools up to 5 times before final answer
        tool_map = {t.name: t for t in self.tools}
        for _ in range(5):
            response = self.llm_with_tools.invoke(messages)

            if not response.tool_calls:
                return response.content

            # Execute each tool call and feed results back
            messages.append(response)
            for tc in response.tool_calls:
                try:
                    result = tool_map[tc["name"]].invoke(tc["args"])
                except Exception as e:
                    result = f"Tool error: {str(e)}"
                messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))

        return response.content
