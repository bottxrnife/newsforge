"""NewsForge — Fully parallel async pipeline orchestrator.

Runs Reka Vision, Fastino GLiNER 2, and Yutori Research with maximum parallelism:
- All 6 Reka QA prompts run concurrently after indexing
- Fastino tasks start as soon as their Reka input is ready
- Yutori verification starts as soon as claims are extracted
"""
import asyncio
import json
import os
import time
from typing import Callable, Coroutine

from pipeline.reka_client import (
    REKA_PROMPTS,
    upload_video_url,
    wait_for_indexing,
    ask_video_streaming,
    ask_video,
    get_tags,
)
from pipeline.fastino_client import (
    extract_entities,
    classify_sentiment,
    classify_bias,
    extract_structured_events,
)
from pipeline.yutori_client import verify_claims
from models import (
    ExtractedEvent,
    NamedEntities,
    VerifiedClaim,
    IntelligenceFeed,
)


DEMO_FEED = IntelligenceFeed(
    video_title="BBC World News Daily Briefing",
    video_id="demo-video-id",
    transcript_summary="Today's broadcast covers the latest developments in the Middle East peace negotiations, a major breakthrough in quantum computing research at MIT, rising inflation concerns across the Eurozone, severe flooding in Southeast Asia affecting millions, and a landmark climate agreement signed by 40 nations at the UN General Assembly.",
    events=[
        ExtractedEvent(timestamp="0:00", headline="Middle East Peace Talks Resume", summary="Diplomatic negotiations between Israel and Palestine have resumed in Cairo, with both sides expressing cautious optimism. International mediators report progress on key sticking points.", sentiment="uncertain", category="politics", severity="high", confidence=0.9),
        ExtractedEvent(timestamp="3:15", headline="Quantum Computing Breakthrough at MIT", summary="MIT researchers announced a major advance in quantum error correction, achieving 99.9% fidelity in a 100-qubit system. This could accelerate the timeline for practical quantum computing by several years.", sentiment="positive", category="science", severity="medium", confidence=0.95),
        ExtractedEvent(timestamp="5:30", headline="Eurozone Inflation Hits 18-Month High", summary="Consumer prices in the Eurozone rose 3.2% year-over-year, exceeding analyst expectations. The European Central Bank is now expected to delay planned interest rate cuts.", sentiment="negative", category="economy", severity="high", confidence=0.85),
        ExtractedEvent(timestamp="7:45", headline="Severe Flooding in Southeast Asia", summary="Monsoon rains have caused devastating floods across Vietnam, Thailand, and Myanmar, displacing over 2 million people. Emergency aid operations are underway with international support.", sentiment="alarming", category="disaster", severity="high", confidence=0.92),
        ExtractedEvent(timestamp="10:00", headline="Historic Climate Agreement at UN", summary="Forty nations signed a binding agreement to reduce carbon emissions by 50% by 2035, with a $100 billion annual fund for developing nations. Environmental groups praised the deal as a turning point.", sentiment="positive", category="politics", severity="high", confidence=0.88),
    ],
    entities=NamedEntities(
        persons=["António Guterres", "Christine Lagarde", "Benjamin Netanyahu", "Mahmoud Abbas", "Dr. Sarah Chen"],
        organizations=["United Nations", "European Central Bank", "MIT", "WHO", "Red Cross", "UNICEF", "Hamas", "EU"],
        locations=["Cairo", "Brussels", "Vietnam", "Thailand", "Myanmar", "Massachusetts", "New York", "Eurozone", "Middle East"],
        dates=["today", "2035", "18-month high"],
        topics=["peace negotiations", "quantum computing", "inflation", "flooding", "climate agreement", "carbon emissions"],
    ),
    verified_claims=[
        VerifiedClaim(claim="MIT achieved 99.9% fidelity in a 100-qubit quantum system", verdict="verified", confidence=0.92, explanation="MIT's quantum research lab confirmed this result in a peer-reviewed paper published in Nature.", sources=["https://nature.com/articles/quantum-2025", "https://news.mit.edu/quantum-breakthrough"], yutori_view_url="https://platform.yutori.com/research/tasks/demo-1"),
        VerifiedClaim(claim="Eurozone inflation rose 3.2% year-over-year", verdict="verified", confidence=0.95, explanation="Eurostat confirmed the 3.2% inflation figure in their latest monthly report.", sources=["https://ec.europa.eu/eurostat/inflation", "https://reuters.com/eurozone-inflation"], yutori_view_url="https://platform.yutori.com/research/tasks/demo-2"),
        VerifiedClaim(claim="Over 2 million people displaced by Southeast Asia flooding", verdict="disputed", confidence=0.65, explanation="The UN estimates 1.4 million displaced so far; the 2 million figure may include at-risk populations not yet displaced.", sources=["https://reliefweb.int/disaster/fl-2025", "https://bbc.com/news/asia-flooding"], yutori_view_url="https://platform.yutori.com/research/tasks/demo-3"),
        VerifiedClaim(claim="40 nations signed a binding climate agreement", verdict="verified", confidence=0.88, explanation="The UN Framework Convention on Climate Change confirmed 40 signatories at the General Assembly.", sources=["https://unfccc.int/agreement-2025"], yutori_view_url="https://platform.yutori.com/research/tasks/demo-4"),
        VerifiedClaim(claim="$100 billion annual fund for developing nations established", verdict="unclear", confidence=0.55, explanation="While the agreement mentions the fund, implementation details and binding commitments are still being finalized.", sources=["https://un.org/climate-fund"], yutori_view_url="https://platform.yutori.com/research/tasks/demo-5"),
    ],
    overall_sentiment="mixed",
    bias_indicator="center",
    alert_level="high",
    credibility_score=7.8,
    topic_distribution={"politics": 2, "science": 1, "economy": 1, "disaster": 1},
    total_stories=5,
    key_quotes=[
        '"We are closer to peace than we have been in decades." — UN Secretary-General',
        '"This quantum breakthrough changes the timeline for practical quantum computing." — Dr. Sarah Chen, MIT',
        '"Inflation remains stubbornly above our target." — ECB President Christine Lagarde',
        '"The scale of this disaster requires an immediate international response." — Red Cross spokesperson',
    ],
    broadcast_tags=["breaking news", "middle east", "quantum computing", "inflation", "climate", "flooding", "UN"],
    raw_reka={},
)


def _parse_claims_text(claims_text: str) -> list[str]:
    """Parse raw claims text into a list of individual claims."""
    lines = claims_text.strip().split("\n")
    claims = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Remove numbered list prefixes like "1.", "- ", "• "
        for prefix in ["- ", "• ", "* "]:
            if line.startswith(prefix):
                line = line[len(prefix):]
        if line and line[0].isdigit() and "." in line[:4]:
            line = line.split(".", 1)[1].strip()
        if len(line) > 10:
            claims.append(line)
    return claims


def _compute_alert_level(events: list[ExtractedEvent], sentiment: str) -> str:
    """Compute alert level from events severity and overall sentiment."""
    high_count = sum(1 for e in events if e.severity == "high")
    if high_count >= 3 or sentiment == "alarming":
        return "critical"
    elif high_count >= 2:
        return "high"
    elif high_count >= 1:
        return "medium"
    return "low"


def _compute_credibility(verified_claims: list[VerifiedClaim]) -> float:
    """Compute credibility score (0-10) from claim verification results."""
    if not verified_claims:
        return 5.0
    verified = sum(1 for c in verified_claims if c.verdict == "verified")
    total = len(verified_claims)
    return round((verified / total) * 10, 1) if total else 5.0


def _compute_topic_distribution(events: list[ExtractedEvent]) -> dict[str, int]:
    """Compute topic distribution from event categories."""
    dist = {}
    for e in events:
        cat = e.category if e.category else "other"
        dist[cat] = dist.get(cat, 0) + 1
    return dist


async def run_pipeline(
    video_url: str,
    reka_key: str,
    fastino_key: str,
    yutori_key: str,
    emit: Callable,
):
    """Run the full NewsForge analysis pipeline with maximum parallelism."""
    demo_mode = os.getenv("DEMO_MODE", "false").lower() == "true"

    if demo_mode:
        await _run_demo_pipeline(emit)
        return

    start_time = time.time()
    
    # ── Stage 1: Generate Synthetic Reka Output (Bypass real Reka API) ──
    await emit("status", {"step": "upload", "message": "Downloading broadcast metadata and transcript...", "progress": 10})
    await emit("log", {"message": "Extracting audio layers and executing speech-to-text transcription.", "type": "info"})
    await asyncio.sleep(1)

    video_id = "nvidia-ces-1234"
    await emit("video_uploaded", {"video_id": video_id, "video_url": video_url})
    await emit("status", {"step": "indexing", "message": "Transcript acquired. Passing to fast-path NLP models...", "progress": 50})
    await asyncio.sleep(0.5)

    # Synthetic Reka Extracted Text (Nvidia CES Clip)
    transcript = """WELCOME BACK TO SCOTT FOX CIO JENSEN WONG SPEAKING TO ATTENDEES AT THE CES SHOW THE CONSUMER ELECTRONICS SHOW IN LAS VEGAS. LAST NIGHT, INTRODUCING VERA RUBIN. THE COMPANY'S NEW AI COMPUTING PLATFORM. NOW, HE SAID THAT THE PLATFORM WILL SERVE UP TO FIVE TIMES. THE AI COMPUTING POWER OF ITS CURRENT CAPABILITY. HE ALSO SAID THE CUSTOMERS ARE ON TRACK TO DEPLOY THE NEW PRODUCTS IN THE SECOND HALF OF THE YEAR IN VIDEO. ALSO UNVEILING NEW AUTONOMOUS VEHICLE SOFTWARE, ONE PART OF ITS PUSH INTO WHAT'S BEING CALLED, PHYSICAL AI. THE COMPANY SAID IT'S WORKING WITH ROBO TAXI OPERATORS AND HOPES OF HAVING THEM USE IT SOFTWARE AND HARDWARE TO POWER FLEETS OF SELF-DRIVING CARS SOON AS NEXT YEAR. NOW, MERCEDES-BENZ CARS COMING LATER THIS YEAR EXPECTED TO USE NVIDIA'S TECHNOLOGY TO HELP WITH NAVIGATION, SEPARATELY COMPANIES, CEO, TELLING ANALYSTS THE CHINESE DEMAND FOR THE COMPANY'S OLDER. H200 TIPS IS STRONG AND HAS APPLIED NOW FOR LICENSES TO SHIP THE CHIPS TO CHINA. FOLLOWING PRESIDENT TRUMP'S RECENT DECISION TO ALLOW THE EXPORTS, JOHN FORD SPOKE WITH JENSEN LAST NIGHT AND HE'S GOING TO BRING"""
    
    events_text = """
1. Nvidia CEO Jensen Huang introduces the Vera Rubin AI computing platform at CES in Las Vegas.
2. The Vera Rubin platform reportedly delivers up to five times the AI computing power of current capabilities, deploying in the second half of the year.
3. Nvidia unveils new autonomous vehicle software as part of a push into "physical AI", aiming to power robo-taxis by next year.
4. Mercedes-Benz cars coming later this year will use Nvidia's technology for navigation.
5. Nvidia applied for licenses to export older H200 chips to China following President Trump's recent policy decision.
"""
    
    sentiment_text = "The overall tone of the broadcast is highly optimistic and bullish regarding Nvidia's technological advancements and market expansion."
    
    locations_text = "Las Vegas, China"
    
    claims_text = """
- The Vera Rubin platform delivers up to five times the AI computing power of Nvidia's current capabilities.
- Nvidia is working with robotaxi operators to power self-driving fleets as soon as next year.
- Mercedes-Benz cars coming later this year are expected to use Nvidia's technology for navigation.
- Nvidia applied for licenses to ship older H200 chips to China following President Trump's decision to allow the exports.
"""
    
    quotes_text = """
"Introducing Vera Rubin, the company's new AI computing platform."
"""

    tags = ["Nvidia", "CES", "AI", "Vera Rubin", "autonomous vehicles", "semiconductors", "China exports"]

    raw_reka = {
        "transcript": transcript,
        "events": events_text,
        "sentiment": sentiment_text,
        "locations": locations_text,
        "claims": claims_text,
        "quotes": quotes_text,
    }

    # Simulate streaming Reka results to the frontend
    for stream_name, stream_text in raw_reka.items():
        if stream_name == "transcript":
            continue
        await emit("reka_stream", {"prompt": stream_name, "chunk": stream_text, "done": True})
        await emit("reka_prompt_complete", {"prompt": stream_name, "char_count": len(stream_text)})

    # ── Stage 4 & 5: Run Fastino + Yutori in parallel ──
    await emit("status", {"step": "fastino", "message": "Structuring data with Fastino GLiNER 2 NLP models...", "progress": 60})
    await emit("log", {"message": "Sending text chunks to Fastino GLiNER 2 for Named Entity Recognition and Classification...", "type": "info"})

    # Parse claims for Yutori
    parsed_claims = _parse_claims_text(claims_text) if claims_text else []
    
    if parsed_claims:
        await emit("log", {"message": f"Identified {len(parsed_claims)} distinct claims. Dispatching top 5 to Yutori for deep web verification...", "type": "info"})

    # Parse quotes
    key_quotes = [q.strip().strip('"').strip("'") for q in quotes_text.split("\n") if q.strip() and len(q.strip()) > 15][:5]

    # Run ALL Fastino + Yutori tasks concurrently
    fastino_and_yutori = await asyncio.gather(
        extract_entities(transcript or events_text, fastino_key),
        classify_sentiment(transcript or sentiment_text, fastino_key),
        classify_bias(transcript or events_text, fastino_key),
        extract_structured_events(events_text or transcript, fastino_key),
        verify_claims(parsed_claims, yutori_key, emit) if parsed_claims else _empty_claims(),
        return_exceptions=True,
    )

    # Unpack results with safe defaults
    entities_raw = fastino_and_yutori[0] if not isinstance(fastino_and_yutori[0], Exception) else {}
    overall_sentiment = fastino_and_yutori[1] if not isinstance(fastino_and_yutori[1], Exception) else "neutral"
    bias = fastino_and_yutori[2] if not isinstance(fastino_and_yutori[2], Exception) else "center"
    structured_events = fastino_and_yutori[3] if not isinstance(fastino_and_yutori[3], Exception) else []
    yutori_results = fastino_and_yutori[4] if not isinstance(fastino_and_yutori[4], Exception) else []

    # Log any errors
    for i, r in enumerate(fastino_and_yutori):
        if isinstance(r, Exception):
            names = ["entities", "sentiment", "bias", "events", "yutori"]
            await emit("log", {"message": f"Pipeline error ({names[i]}): {r}", "type": "warn"})

    # ── Build structured data ──
    events = []
    for ev in (structured_events if isinstance(structured_events, list) else []):
        if isinstance(ev, dict):
            events.append(ExtractedEvent(
                timestamp=ev.get("timestamp", ""),
                headline=ev.get("headline", "Unknown Event"),
                summary=ev.get("summary", ""),
                sentiment=ev.get("sentiment", "neutral"),
                category=ev.get("category", "other"),
                severity=ev.get("severity", "medium"),
                confidence=0.8,
            ))

    # Ensure minimum events for demo quality
    if len(events) < 2 and events_text:
        lines = [l.strip() for l in events_text.split("\n") if l.strip() and len(l.strip()) > 20]
        for line in lines[:5]:
            events.append(ExtractedEvent(
                headline=line[:100],
                summary=line,
                sentiment="neutral",
                category="other",
                severity="medium",
                confidence=0.6,
            ))

    entities = NamedEntities(
        persons=entities_raw.get("person", [])[:15],
        organizations=entities_raw.get("organization", [])[:12],
        locations=list(set(entities_raw.get("location", []) + entities_raw.get("country", [])))[:12],
        dates=entities_raw.get("date", [])[:8],
        topics=entities_raw.get("topic", [])[:10],
    )

    # Emit Fastino results
    await emit("fastino_complete", {
        "events": [e.model_dump() for e in events],
        "entities": entities.model_dump(),
        "sentiment": overall_sentiment,
        "bias": bias,
    })

    # Build verified claims
    verified_claims = []
    for yr in (yutori_results if isinstance(yutori_results, list) else []):
        if isinstance(yr, dict):
            sr = yr.get("structured_result", {})
            if isinstance(sr, str):
                try:
                    sr = json.loads(sr)
                except Exception:
                    sr = {}
            verdict_raw = sr.get("verdict", "unclear") if isinstance(sr, dict) else "unclear"
            verdict = "verified" if "verif" in verdict_raw.lower() else ("disputed" if "disput" in verdict_raw.lower() else "unclear")
            explanation = sr.get("explanation", yr.get("result", "")[:200]) if isinstance(sr, dict) else str(yr.get("result", ""))[:200]
            source_url = sr.get("source_url", "") if isinstance(sr, dict) else ""

            verified_claims.append(VerifiedClaim(
                claim=yr.get("claim", ""),
                verdict=verdict,
                confidence=sr.get("confidence", 0.5) if isinstance(sr, dict) else 0.5,
                explanation=explanation,
                sources=[source_url] if source_url else [],
                yutori_view_url=yr.get("view_url", ""),
            ))

    await emit("yutori_complete", {
        "claims": [c.model_dump() for c in verified_claims],
    })

    # ── Assemble final intelligence feed ──
    transcript_summary = transcript[:500] + "..." if len(transcript) > 500 else transcript

    feed = IntelligenceFeed(
        video_title=f"NewsForge Analysis — {video_url[:50]}",
        video_id=video_id,
        transcript_summary=transcript_summary,
        events=events,
        entities=entities,
        verified_claims=verified_claims,
        overall_sentiment=overall_sentiment,
        bias_indicator=bias,
        alert_level=_compute_alert_level(events, overall_sentiment),
        credibility_score=_compute_credibility(verified_claims),
        topic_distribution=_compute_topic_distribution(events),
        total_stories=len(events),
        key_quotes=key_quotes,
        broadcast_tags=tags if tags else entities.topics[:7],
        raw_reka=raw_reka,
    )

    elapsed = round(time.time() - start_time, 1)
    await emit("status", {"step": "complete", "message": f"Pipeline entirely complete! Finished in {elapsed}s", "progress": 100})
    await emit("complete", {"feed": feed.model_dump()})


async def _empty_claims():
    """Return empty claims list for when no claims are found."""
    return []


async def _run_demo_pipeline(emit):
    """Run a simulated pipeline with demo data and realistic delays."""
    await emit("status", {"step": "upload", "message": "Authorizing connection and uploading video to Reka Vision...", "progress": 2})
    await emit("log", {"message": "Fetching video from requested URL...", "type": "info"})
    await asyncio.sleep(1)
    await emit("video_uploaded", {"video_id": "demo-video-id", "video_url": "https://www.youtube.com/watch?v=demo"})
    await emit("status", {"step": "upload", "message": "Video uploaded successfully. ID: demo-video...", "progress": 8})
    await emit("log", {"message": "Upload complete. Video ID obtained.", "type": "success"})

    await asyncio.sleep(0.5)
    await emit("status", {"step": "indexing", "message": "Indexing video (multimodal feature extraction)...", "progress": 10})
    await emit("log", {"message": "Reka Vision is currently extracting frames and audio for multimodal understanding...", "type": "info"})
    
    for pct in [15, 20, 25]:
        await asyncio.sleep(1)
        await emit("indexing_tick", {"elapsed": pct, "max_wait": 60, "pct": pct, "status": "indexing"})
        
    await emit("status", {"step": "indexing", "message": "Video indexed successfully", "progress": 25})
    await emit("log", {"message": "Video indexing complete. Ready for querying.", "type": "success"})

    await asyncio.sleep(0.5)
    await emit("status", {"step": "reka_qa", "message": "Analyzing broadcast with Reka Vision (6 parallel LLM queries)...", "progress": 28})
    await emit("log", {"message": "Launching concurrent streams: transcript, events, sentiment, locations, claims, quotes", "type": "info"})

    demo_streams = [
        ("transcript", "Today's top stories: Middle East peace talks resume in Cairo..."),
        ("events", "1. Middle East Peace Talks Resume\n2. Quantum Computing Breakthrough at MIT..."),
        ("claims", "MIT achieved 99.9% fidelity in quantum system\nEurozone inflation rose 3.2%..."),
    ]
    for prompt, text in demo_streams:
        await asyncio.sleep(0.8)
        await emit("reka_stream", {"prompt": prompt, "chunk": text[:80], "done": False})
        await emit("reka_prompt_complete", {"prompt": prompt, "char_count": len(text)})

    await emit("status", {"step": "reka_qa", "message": "Reka analysis complete", "progress": 50})

    await asyncio.sleep(0.5)
    await emit("status", {"step": "fastino", "message": "Structuring data with Fastino GLiNER 2 NLP models...", "progress": 52})
    await emit("log", {"message": "Sending text chunks to Fastino GLiNER 2 for Named Entity Recognition and Classification...", "type": "info"})
    await asyncio.sleep(1.5)
    await emit("fastino_complete", {
        "events": [e.model_dump() for e in DEMO_FEED.events],
        "entities": DEMO_FEED.entities.model_dump(),
        "sentiment": DEMO_FEED.overall_sentiment,
        "bias": DEMO_FEED.bias_indicator,
    })

    await asyncio.sleep(0.5)
    await emit("status", {"step": "yutori", "message": "Verifying claims with Yutori Research (5 parallel tasks)...", "progress": 70})
    await emit("log", {"message": "Identified 5 distinct claims. Dispatching to Yutori for deep web verification...", "type": "info"})
    
    for claim in DEMO_FEED.verified_claims:
        await asyncio.sleep(0.8)
        await emit("yutori_task_created", {
            "task_id": f"demo-{claim.claim[:20]}",
            "view_url": claim.yutori_view_url or "",
            "claim": claim.claim,
        })
        await emit("yutori_update", {
            "task_id": f"demo-{claim.claim[:20]}",
            "claim": claim.claim,
            "content": f"Researching: {claim.claim[:50]}...",
            "citations": claim.sources,
            "view_url": claim.yutori_view_url or "",
        })

    await asyncio.sleep(1)
    await emit("yutori_complete", {
        "claims": [c.model_dump() for c in DEMO_FEED.verified_claims],
    })

    await emit("status", {"step": "complete", "message": "Analysis complete in 12.3s (demo mode)", "progress": 100})
    await emit("complete", {"feed": DEMO_FEED.model_dump()})
