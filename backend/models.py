"""NewsForge — Pydantic v2 data models for the intelligence feed."""
from __future__ import annotations
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class ExtractedEvent(BaseModel):
    timestamp: Optional[str] = None
    headline: str = ""
    summary: str = ""
    sentiment: str = "neutral"
    category: str = "other"
    severity: str = "medium"
    confidence: float = 0.5


class NamedEntities(BaseModel):
    persons: List[str] = Field(default_factory=list)
    organizations: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    dates: List[str] = Field(default_factory=list)
    topics: List[str] = Field(default_factory=list)


class VerifiedClaim(BaseModel):
    claim: str = ""
    verdict: str = "unclear"
    confidence: float = 0.5
    explanation: str = ""
    sources: List[str] = Field(default_factory=list)
    yutori_view_url: Optional[str] = None


class IntelligenceFeed(BaseModel):
    video_title: str = ""
    video_id: str = ""
    transcript_summary: str = ""
    events: List[ExtractedEvent] = Field(default_factory=list)
    entities: NamedEntities = Field(default_factory=NamedEntities)
    verified_claims: List[VerifiedClaim] = Field(default_factory=list)
    overall_sentiment: str = "neutral"
    bias_indicator: str = "center"
    alert_level: str = "low"
    credibility_score: float = 5.0
    topic_distribution: Dict[str, int] = Field(default_factory=dict)
    total_stories: int = 0
    key_quotes: List[str] = Field(default_factory=list)
    broadcast_tags: List[str] = Field(default_factory=list)
    raw_reka: Dict = Field(default_factory=dict)


class AnalyzeRequest(BaseModel):
    video_url: str
    reka_key: str
    fastino_key: str
    yutori_key: str


class TestKeysRequest(BaseModel):
    reka_key: str
    fastino_key: str
    yutori_key: str
