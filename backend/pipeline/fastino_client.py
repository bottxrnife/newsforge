"""NewsForge — Fastino GLiNER 2 API client (NER, classify, structured extraction)."""
import httpx

FASTINO_BASE = "https://api.pioneer.ai"


def chunk_text(text: str, max_bytes: int = 7000) -> list[str]:
    """Split text into chunks ≤ max_bytes on sentence boundaries."""
    if len(text.encode("utf-8")) <= max_bytes:
        return [text]

    sentences = text.replace("\n", ". ").split(". ")
    chunks = []
    current = ""
    for s in sentences:
        candidate = current + s + ". " if current else s + ". "
        if len(candidate.encode("utf-8")) > max_bytes:
            if current:
                chunks.append(current.strip())
            current = s + ". "
        else:
            current = candidate
    if current.strip():
        chunks.append(current.strip())
    return chunks if chunks else [text[:max_bytes]]


async def _call_gliner(payload: dict, api_key: str) -> dict:
    """Make a single call to the GLiNER 2 endpoint."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{FASTINO_BASE}/gliner-2",
            headers={"X-Api-Key": api_key},
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


async def extract_entities(text: str, api_key: str) -> dict:
    """Extract named entities from text. Handles chunking for long text."""
    schema = ["person", "organization", "location", "country", "date", "topic"]
    merged = {label: [] for label in schema}

    for chunk in chunk_text(text):
        data = await _call_gliner({
            "task": "extract_entities",
            "text": chunk,
            "schema": schema,
        }, api_key)
        entities = data.get("result", {}).get("entities", {})
        for label in schema:
            for item in entities.get(label, []):
                if item and item not in merged[label]:
                    merged[label].append(item)

    return merged


async def classify_sentiment(text: str, api_key: str) -> str:
    """Classify overall sentiment of text."""
    truncated = text[:7000]
    data = await _call_gliner({
        "task": "classify_text",
        "text": truncated,
        "schema": {"categories": ["positive", "negative", "neutral", "alarming", "uncertain"]},
    }, api_key)
    return data.get("result", {}).get("category", "neutral")


async def classify_bias(text: str, api_key: str) -> str:
    """Classify media bias of text."""
    truncated = text[:7000]
    data = await _call_gliner({
        "task": "classify_text",
        "text": truncated,
        "schema": {"categories": ["left-leaning", "center", "right-leaning", "unclear"]},
    }, api_key)
    return data.get("result", {}).get("category", "center")


async def extract_structured_events(text: str, api_key: str) -> list[dict]:
    """Extract structured news events from text."""
    all_events = []
    for chunk in chunk_text(text):
        data = await _call_gliner({
            "task": "extract_json",
            "text": chunk,
            "schema": {
                "events": [
                    "headline::str::Short event headline",
                    "summary::str::Two sentence event summary",
                    "category::str::politics or economy or conflict or science or disaster or other",
                    "sentiment::str::positive or negative or neutral or alarming or uncertain",
                    "severity::str::low or medium or high",
                    "timestamp::str::Approximate time in broadcast if mentioned",
                ]
            },
        }, api_key)
        events = data.get("result", {}).get("events", [])
        if isinstance(events, list):
            all_events.extend(events)
    return all_events
