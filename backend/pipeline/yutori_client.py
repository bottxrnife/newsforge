"""NewsForge — Yutori Research API client (create task, poll with live updates)."""
import asyncio
import httpx

YUTORI_BASE = "https://api.yutori.com"


async def create_research_task(claim: str, api_key: str, emit=None) -> dict:
    """Create a Yutori research task to verify a claim. Returns task info dict."""
    query = (
        f'Verify this news claim with recent web sources: "{claim}" '
        f"— Is this accurate? Provide a one-sentence verdict and a primary source URL."
    )
    output_schema = {
        "type": "object",
        "properties": {
            "verdict": {
                "type": "string",
                "description": "verified, disputed, or unclear",
            },
            "explanation": {
                "type": "string",
                "description": "One-sentence explanation of the verdict",
            },
            "source_url": {
                "type": "string",
                "description": "Primary source URL supporting the verdict",
            },
            "confidence": {
                "type": "number",
                "description": "Confidence score 0.0 to 1.0",
            },
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{YUTORI_BASE}/v1/research/tasks",
            headers={
                "X-API-Key": api_key,
                "Content-Type": "application/json",
            },
            json={
                "query": query,
                "output_schema": output_schema,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    result = {
        "task_id": data.get("task_id", ""),
        "view_url": data.get("view_url", ""),
        "status": data.get("status", "queued"),
        "claim": claim,
    }

    if emit:
        await emit("yutori_task_created", {
            "task_id": result["task_id"],
            "view_url": result["view_url"],
            "claim": claim,
        })

    return result


async def poll_one_task(
    task_id: str,
    claim: str,
    api_key: str,
    emit=None,
    max_wait: int = 180,
) -> dict:
    """Poll a single Yutori research task until complete. Streams live updates."""
    elapsed = 0
    interval = 6
    last_update_count = 0

    while elapsed < max_wait:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{YUTORI_BASE}/v1/research/tasks/{task_id}",
                headers={"X-API-Key": api_key},
            )
            resp.raise_for_status()
            data = resp.json()

        status = data.get("status", "unknown")
        updates = data.get("updates", [])

        if len(updates) > last_update_count and emit:
            new_updates = updates[last_update_count:]
            for upd in new_updates:
                citations = upd.get("citations", [])
                citation_urls = [c.get("url", "") for c in citations if c.get("url")]
                await emit("yutori_update", {
                    "task_id": task_id,
                    "claim": claim,
                    "content": upd.get("content", "")[:200],
                    "citations": citation_urls,
                    "view_url": data.get("view_url", ""),
                })
            last_update_count = len(updates)

        if status == "succeeded":
            return {
                "claim": claim,
                "task_id": task_id,
                "view_url": data.get("view_url", ""),
                "result": data.get("result", ""),
                "structured_result": data.get("structured_result", {}),
                "status": "succeeded",
            }
        elif status == "failed":
            return {
                "claim": claim,
                "task_id": task_id,
                "view_url": data.get("view_url", ""),
                "result": "",
                "structured_result": {},
                "status": "failed",
            }

        await asyncio.sleep(interval)
        elapsed += interval

    return {
        "claim": claim,
        "task_id": task_id,
        "view_url": "",
        "result": "",
        "structured_result": {},
        "status": "timeout",
    }


async def verify_claims(claims: list[str], api_key: str, emit=None) -> list[dict]:
    """Verify multiple claims in parallel using Yutori Research API."""
    top_claims = claims[:5]

    task_refs = []
    for claim in top_claims:
        try:
            ref = await create_research_task(claim, api_key, emit)
            task_refs.append(ref)
        except Exception as e:
            if emit:
                await emit("log", {"message": f"Failed to create Yutori task for: {claim[:50]}... — {e}", "type": "warn"})

    if not task_refs:
        return []

    poll_tasks = [
        poll_one_task(ref["task_id"], ref["claim"], api_key, emit)
        for ref in task_refs
    ]
    results = await asyncio.gather(*poll_tasks, return_exceptions=True)

    verified = []
    for r in results:
        if isinstance(r, dict):
            verified.append(r)
        elif isinstance(r, Exception):
            if emit:
                await emit("log", {"message": f"Yutori poll error: {r}", "type": "warn"})

    return verified
