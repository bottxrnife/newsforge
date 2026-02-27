"""NewsForge — FastAPI backend with SSE streaming pipeline."""
import asyncio
import json
import os
import time
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from models import AnalyzeRequest
from pipeline.orchestrator import run_pipeline

app = FastAPI(title="NewsForge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": time.time(), "service": "newsforge"}


@app.post("/api/analyze")
async def analyze(request: Request):
    """Run the full analysis pipeline, streaming results via SSE."""
    body = await request.json()
    video_url = body.get("video_url", "")
    reka_key = os.getenv("REKA_API_KEY", "")
    fastino_key = os.getenv("FASTINO_API_KEY", "")
    yutori_key = os.getenv("YUTORI_API_KEY", "")

    if not video_url:
        return {"error": "video_url is required"}
    if not reka_key or not fastino_key or not yutori_key:
        return {"error": "API keys are not properly configured in the backend environment"}

    queue: asyncio.Queue = asyncio.Queue()
    pipeline_done = asyncio.Event()

    async def emit(event_type: str, data: dict):
        await queue.put({"event": event_type, "data": data})

    async def run_pipeline_task():
        try:
            await run_pipeline(video_url, reka_key, fastino_key, yutori_key, emit)
        except Exception as e:
            await emit("error", {"message": str(e), "stage": "pipeline"})
        finally:
            pipeline_done.set()
            await queue.put(None)  # sentinel

    async def event_generator():
        task = asyncio.create_task(run_pipeline_task())

        # Heartbeat to keep connection alive
        heartbeat_interval = 15

        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=heartbeat_interval)
                if item is None:
                    break
                yield {
                    "event": item["event"],
                    "data": json.dumps(item["data"]),
                }
            except asyncio.TimeoutError:
                # Send heartbeat
                yield {
                    "event": "ping",
                    "data": json.dumps({}),
                }

        # Ensure task is done
        if not task.done():
            await task

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
