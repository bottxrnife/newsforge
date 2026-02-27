"""NewsForge — Reka Vision API client (upload, poll, streaming QA, tags)."""
import asyncio
import json
import httpx

REKA_BASE = "https://vision-agent.api.reka.ai"

REKA_PROMPTS = {
    "transcript": (
        "Provide a detailed transcript of all spoken words in this news broadcast. "
        "Include speaker names when identifiable."
    ),
    "events": (
        "List every distinct news story or segment in this broadcast. "
        "For each, provide: approximate timestamp in the video, a one-line headline, "
        "and a two-sentence summary. Format as a numbered list."
    ),
    "sentiment": (
        "For each story segment in this broadcast, describe the emotional tone. "
        "Is it positive, negative, neutral, alarming, or uncertain? "
        "Also note the overall tone of the entire broadcast."
    ),
    "locations": (
        "List ALL geographic locations, cities, countries, and regions mentioned "
        "or clearly shown in this news broadcast. One per line."
    ),
    "claims": (
        "Extract all concrete factual claims, statistics, or assertions made in this "
        "broadcast. One claim per line. Examples: '34 people were injured', "
        "'GDP rose 2.1%', 'The president signed the bill today'."
    ),
    "quotes": (
        "Extract the 3-5 most significant or quotable statements made by speakers "
        "in this broadcast. Include who said it if identifiable. Format as quoted text."
    ),
}


async def upload_video_url(video_url: str, api_key: str) -> str:
    """Upload a video by URL to Reka Vision and return video_id."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{REKA_BASE}/v1/videos/upload",
            headers={"X-Api-Key": api_key},
            data={
                "video_url": video_url,
                "video_name": "newsforge_analysis",
                "index": "true",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("video_id", data.get("id", ""))


async def wait_for_indexing(video_id: str, api_key: str, emit, max_wait: int = 300):
    """Poll video status until indexed or timeout. Emits progress ticks."""
    elapsed = 0
    interval = 8
    while elapsed < max_wait:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{REKA_BASE}/v1/videos/{video_id}",
                headers={"X-Api-Key": api_key},
            )
            resp.raise_for_status()
            data = resp.json()

        status = data.get("indexing_status", data.get("status", "unknown"))
        pct = min(int((elapsed / max_wait) * 100), 99)

        if status == "indexed":
            await emit("status", {
                "step": "indexing",
                "message": f"Video indexed successfully ({elapsed}s)",
                "progress": 25,
            })
            return
        elif status == "failed":
            raise RuntimeError(f"Reka indexing failed for video {video_id}")

        await emit("indexing_tick", {
            "elapsed": elapsed,
            "max_wait": max_wait,
            "pct": pct,
            "status": status,
        })

        await asyncio.sleep(interval)
        elapsed += interval

    raise TimeoutError(f"Reka indexing timed out after {max_wait}s")


async def ask_video(video_id: str, question: str, api_key: str) -> str:
    """Ask a question about an indexed video (non-streaming)."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{REKA_BASE}/v1/qa/chat",
            headers={
                "X-Api-Key": api_key,
                "Content-Type": "application/json",
            },
            json={
                "video_id": video_id,
                "messages": [{"role": "user", "content": question}],
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("chat_response", data.get("message", {}).get("content", str(data)))


async def ask_video_streaming(
    video_id: str,
    question: str,
    prompt_name: str,
    api_key: str,
    emit,
) -> str:
    """Ask a question with streaming, emitting reka_stream events. Returns full text."""
    accumulated = ""
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            async with client.stream(
                "POST",
                f"{REKA_BASE}/v1/qa/chat",
                headers={
                    "X-Api-Key": api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "video_id": video_id,
                    "stream": True,
                    "messages": [{"role": "user", "content": question}],
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("data:"):
                        chunk_str = line[5:].strip()
                        if chunk_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(chunk_str)
                            text = chunk_data.get("chat_response", "")
                            if text:
                                accumulated = text
                                await emit("reka_stream", {
                                    "prompt": prompt_name,
                                    "chunk": text[-80:] if len(text) > 80 else text,
                                    "done": False,
                                })
                        except json.JSONDecodeError:
                            accumulated += chunk_str
                            await emit("reka_stream", {
                                "prompt": prompt_name,
                                "chunk": chunk_str[:80],
                                "done": False,
                            })
    except Exception:
        if not accumulated:
            accumulated = await ask_video(video_id, question, api_key)

    await emit("reka_prompt_complete", {
        "prompt": prompt_name,
        "char_count": len(accumulated),
    })
    return accumulated


async def get_tags(video_id: str, api_key: str) -> list:
    """Get indexed tags for a video. Returns empty list on failure."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{REKA_BASE}/v1/qa/indexedtag",
                headers={
                    "X-Api-Key": api_key,
                    "Content-Type": "application/json",
                },
                json={"video_id": video_id},
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    return data
                return data.get("tags", [])
    except Exception:
        pass
    return []
