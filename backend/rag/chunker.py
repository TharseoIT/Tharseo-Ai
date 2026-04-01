from typing import Iterator


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """
    Paragraph-aware chunker.
    Accumulates paragraphs up to chunk_size, then starts the next chunk
    with an overlap tail from the previous one.
    Oversized single paragraphs are hard-split by characters.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current_parts: list[str] = []
    current_len: int = 0

    def flush() -> None:
        if current_parts:
            chunks.append("\n\n".join(current_parts))

    for para in paragraphs:
        if len(para) > chunk_size:
            flush()
            current_parts = []
            current_len = 0
            for hard_chunk in _hard_split(para, chunk_size, overlap):
                chunks.append(hard_chunk)
            continue

        separator = 2 if current_parts else 0
        if current_len + separator + len(para) > chunk_size and current_parts:
            flush()
            overlap_text = chunks[-1][-overlap:] if chunks else ""
            current_parts = [overlap_text] if overlap_text else []
            current_len = len(overlap_text)

        current_parts.append(para)
        current_len += (2 if len(current_parts) > 1 else 0) + len(para)

    flush()
    return [c for c in chunks if c.strip()]


def _hard_split(text: str, chunk_size: int, overlap: int) -> Iterator[str]:
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        yield text[start:end]
        start = end - overlap
        if start >= len(text):
            break
