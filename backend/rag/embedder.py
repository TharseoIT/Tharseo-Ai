from __future__ import annotations
import logging
from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384


@lru_cache(maxsize=1)
def get_embedder() -> "SentenceTransformer":
    """
    Load sentence-transformers model once and cache for process lifetime.
    First call downloads ~90MB from HuggingFace.
    Lazy import defers this until the first upload request — not at startup.
    """
    logger.info("Loading sentence-transformers model %s ...", MODEL_NAME)
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME, device="cpu")
    logger.info("Model loaded. Embedding dim: %d", model.get_sentence_embedding_dimension())
    return model


def embed_texts(texts: list[str]) -> list[str]:
    """Embed a list of strings. Returns list of JSON-serialized float vectors for DB storage."""
    import json
    model = get_embedder()
    vectors = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return [json.dumps(v.tolist()) for v in vectors]


def embed_query(text: str) -> list[float]:
    """Embed a single query string. Returns a plain float list for cosine similarity."""
    model = get_embedder()
    vector = model.encode([text], convert_to_numpy=True, show_progress_bar=False)
    return vector[0].tolist()
