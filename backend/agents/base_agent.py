from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from config import settings
from typing import List, Optional


class BaseAgent:
    """
    Base class for all Tharseo AI agents.
    Stateless — history is passed in per request from the database.
    Supports optional search tool, OCI tool, and RAG retrieval via context injection.
    """

    def __init__(self, name: str, system_prompt: str, search_tool=None, oci_tool=None):
        self.name = name
        self.system_prompt = system_prompt
        self.search_tool = search_tool
        self.oci_tool = oci_tool
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

    def _retrieve_rag_context(self, user_message: str, user_id: int, db) -> Optional[str]:
        """
        Find top-5 most semantically similar document chunks for this user.
        Uses numpy cosine similarity (embeddings stored as JSON text).
        Returns formatted string or None if no documents exist.
        Non-fatal — returns None on any error.
        """
        try:
            import json
            import numpy as np
            from rag.embedder import embed_query
            from models import DocumentChunk

            rows = (
                db.query(DocumentChunk)
                .filter(DocumentChunk.user_id == user_id)
                .all()
            )
            if not rows:
                return None

            query_vec = np.array(embed_query(user_message), dtype=np.float32)
            query_norm = np.linalg.norm(query_vec)
            if query_norm == 0:
                return None

            scored = []
            for r in rows:
                try:
                    chunk_vec = np.array(json.loads(r.embedding), dtype=np.float32)
                    chunk_norm = np.linalg.norm(chunk_vec)
                    if chunk_norm == 0:
                        continue
                    similarity = float(np.dot(query_vec, chunk_vec) / (query_norm * chunk_norm))
                    scored.append((similarity, r))
                except Exception:
                    continue

            if not scored:
                return None

            top5 = sorted(scored, key=lambda x: x[0], reverse=True)[:5]

            return "\n\n---\n".join(
                f"[From uploaded document, chunk {r.chunk_index}]\n{r.content}"
                for _, r in top5
            )
        except Exception:
            return None

    def chat(self, user_message: str, history: List, db=None, user_id: Optional[int] = None) -> str:
        """
        history: list of dicts [{"role": "user"|"ai", "content": "..."}]
        db: SQLAlchemy session (optional) — required for RAG retrieval
        user_id: int (optional) — required for RAG retrieval
        """
        lc_history = []
        for msg in history:
            if msg["role"] == "user":
                lc_history.append(HumanMessage(content=msg["content"]))
            else:
                lc_history.append(AIMessage(content=msg["content"]))

        system = self.system_prompt

        # Inject RAG context from user's uploaded documents
        if db is not None and user_id is not None:
            rag_context = self._retrieve_rag_context(user_message, user_id, db)
            if rag_context:
                system += f"\n\n---\nRelevant context from the user's uploaded documents (use this to answer their question if applicable):\n{rag_context}\n---"

        # Inject web search results if needed
        if self.search_tool and self._should_search(user_message):
            try:
                results = self.search_tool.run(user_message)
                system += f"\n\n---\nLive web search results (use these to supplement your answer):\n{results}\n---"
            except Exception:
                pass

        # Inject live OCI resource data if query is OCI-related
        if self.oci_tool:
            try:
                oci_data = self.oci_tool.run(user_message)
                if oci_data:
                    system += f"\n\n---\nLive OCI environment snapshot (use this to answer questions about current infrastructure):\n{oci_data}\n---"
            except Exception:
                pass

        messages = [SystemMessage(content=system)] + lc_history + [HumanMessage(content=user_message)]
        response = self.llm.invoke(messages)
        return response.content
