# 🔴 NewsForge — Autonomous AI News Intelligence

**NewsForge** is a single-input, fully autonomous web app that converts a raw news video URL into a structured, verified intelligence feed. Paste a YouTube link, click **Analyze**, and watch a live dashboard fill with events, entities, sentiment, bias indicators, and fact-checked claims — all without any manual configuration.

Built for the **Autonomous Agents Hackathon** using three sponsor tools:
- **Reka Vision API** — Video understanding, transcript extraction, QA
- **Fastino GLiNER 2** — Named entity recognition, sentiment/bias classification, structured event extraction
- **Yutori Research API** — Deep web research for claim verification with 100+ MCP tools

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 16 Frontend (React 19.2 + Tailwind + TypeScript)   │
│  ┌──────────┐ ┌───────────────┐ ┌─────────────────────────┐│
│  │VideoInput│→│LiveProcessing │→│   Full Dashboard        ││
│  │  Form    │ │  Panel + Log  │ │ Analytics/Events/Claims ││
│  └──────────┘ └───────────────┘ └─────────────────────────┘│
│                    ↕ SSE Stream                             │
├─────────────────────────────────────────────────────────────┤
│  FastAPI Backend (Python 3, async, SSE)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Parallel Orchestrator                    │  │
│  │  ┌────────┐  ┌──────────┐  ┌─────────┐              │  │
│  │  │ Reka   │  │ Fastino  │  │ Yutori  │              │  │
│  │  │ Vision │  │ GLiNER 2 │  │Research │              │  │
│  │  │ 6 QA ∥│  │ 4 NLP  ∥ │  │ 5 tasks∥│              │  │
│  │  └────────┘  └──────────┘  └─────────┘              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Set up API Keys
```bash
git clone https://github.com/YOUR_USERNAME/newsforge.git
cd newsforge
cp .env.example .env
```
Edit `.env` and add your keys. The backend automatically picks them up — no frontend input required.

| Service | Get Key At | Format |
|---------|-----------|--------|
| Reka Vision | [platform.reka.ai](https://platform.reka.ai) | Hex string |
| Fastino GLiNER 2 | [gliner.pioneer.ai](https://gliner.pioneer.ai) | `pio_sk_...` |
| Yutori Research | [platform.yutori.com](https://platform.yutori.com) | `yt_...` |

### 2. Start the backend
```bash
pip3 install -r backend/requirements.txt
cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Start the frontend
```bash
cd frontend && npm install && npm run dev
```

### 4. Open the app
Visit **http://localhost:3000**, paste a YouTube news video URL, and click **Analyze Broadcast**. The system handles the rest autonomously.

---

## Demo Mode

Set `DEMO_MODE=true` in your `.env` file to run with pre-built demo data (no API keys needed). This is useful for offline demos and testing the UI animations.

```bash
DEMO_MODE=true python3 -m uvicorn main:app --port 8000
```

---

## Features

- **Fully Autonomous** — One click triggers the entire pipeline
- **Live Streaming UI** — Watch the AI think in real-time via SSE
- **Maximum Parallelism** — 6 Reka QA calls, 4 Fastino tasks, 5 Yutori research tasks run concurrently
- **8 Analytics Metrics** — Alert level, story count, entity count, claim verification rate, media bias, credibility score, topic mix, broadcast mood
- **Claim Verification** — Each claim fact-checked by Yutori with clickable source links
- **Entity Cloud** — People, organizations, locations, topics extracted and visualized
- **Sentiment Timeline** — Track emotional arc across the broadcast
- **Dark Mode** — Beautiful hackathon-grade UI built with Tailwind CSS

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19.2, TypeScript, Tailwind CSS v4 |
| State | Zustand |
| Backend | FastAPI, Python 3, httpx (async) |
| SSE | sse-starlette |
| APIs | Reka Vision, Fastino GLiNER 2 (Pioneer AI), Yutori Research |

---

## Judging Criteria Alignment

| Criteria (20% each) | How NewsForge Delivers |
|---------------------|----------------------|
| **Autonomy** | Single click → full pipeline runs without intervention. All 3 APIs orchestrated automatically. |
| **Idea** | Transforms noisy news broadcasts into machine-consumable intelligence feeds with verified claims. |
| **Technical Implementation** | Async parallel pipeline, SSE streaming, Next.js 16 + React 19 + FastAPI, proper error handling. |
| **Tool Use** | Deep use of Reka (6 QA calls + tags), Fastino (4 extraction tasks), Yutori (5 research tasks). |
| **Presentation** | Live-updating dashboard with progress bar, streaming log, and interactive analytics — demoable in <3 min. |

---

## License

MIT
