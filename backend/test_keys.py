"""
NewsForge — API Key Tester
Run this FIRST before building anything to verify all 3 sponsor API keys work.
Usage: python test_keys.py
"""
import asyncio
import httpx
import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

REKA_API_KEY = os.getenv("REKA_API_KEY", "")
FASTINO_API_KEY = os.getenv("FASTINO_API_KEY", "")
YUTORI_API_KEY = os.getenv("YUTORI_API_KEY", "")

REKA_BASE = "https://vision-agent.api.reka.ai"
FASTINO_BASE = "https://api.pioneer.ai"
YUTORI_BASE = "https://api.yutori.com"


async def test_reka():
    """Test Reka Vision API by listing videos."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{REKA_BASE}/v1/videos",
            headers={"X-Api-Key": REKA_API_KEY},
        )
        if resp.status_code == 200:
            data = resp.json()
            print(f"  ✅ Reka Vision API — OK (status {resp.status_code}, {len(data) if isinstance(data, list) else 'obj'} response)")
            return True
        else:
            print(f"  ❌ Reka Vision API — FAILED (status {resp.status_code}: {resp.text[:200]})")
            return False


async def test_fastino():
    """Test Fastino GLiNER 2 API with a simple classify call."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{FASTINO_BASE}/gliner-2",
            headers={"X-Api-Key": FASTINO_API_KEY},
            json={
                "task": "classify_text",
                "text": "The weather today is sunny and warm.",
                "schema": {"categories": ["positive", "negative", "neutral"]},
            },
        )
        if resp.status_code == 200:
            data = resp.json()
            category = data.get("result", {}).get("category", "unknown")
            print(f"  ✅ Fastino GLiNER 2 API — OK (status {resp.status_code}, classified as: {category})")
            return True
        else:
            print(f"  ❌ Fastino GLiNER 2 API — FAILED (status {resp.status_code}: {resp.text[:200]})")
            return False


async def test_yutori():
    """Test Yutori Research API by creating a simple research task."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{YUTORI_BASE}/v1/research/tasks",
            headers={
                "X-API-Key": YUTORI_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "query": "What is the current date today?",
            },
        )
        if resp.status_code in (200, 201, 202):
            data = resp.json()
            task_id = data.get("task_id", "unknown")
            view_url = data.get("view_url", "none")
            print(f"  ✅ Yutori Research API — OK (status {resp.status_code}, task_id: {task_id})")
            print(f"     View URL: {view_url}")
            return True
        else:
            print(f"  ❌ Yutori Research API — FAILED (status {resp.status_code}: {resp.text[:200]})")
            return False


async def main():
    print("=" * 60)
    print("  NewsForge — API Key Verification")
    print("=" * 60)
    print()

    if not REKA_API_KEY:
        print("  ⚠️  REKA_API_KEY not set in .env")
    if not FASTINO_API_KEY:
        print("  ⚠️  FASTINO_API_KEY not set in .env")
    if not YUTORI_API_KEY:
        print("  ⚠️  YUTORI_API_KEY not set in .env")

    print()
    print("Testing APIs concurrently...")
    print()

    results = await asyncio.gather(
        test_reka(),
        test_fastino(),
        test_yutori(),
        return_exceptions=True,
    )

    print()
    passed = sum(1 for r in results if r is True)
    failed = sum(1 for r in results if r is not True)

    for i, r in enumerate(results):
        if isinstance(r, Exception):
            names = ["Reka", "Fastino", "Yutori"]
            print(f"  ❌ {names[i]} — Exception: {r}")

    print(f"\n  Result: {passed}/3 APIs working", end="")
    if failed:
        print(f" ({failed} failed)")
    else:
        print(" — All good! 🚀")
    print()

    return passed == 3


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
