export interface ExtractedEvent {
  timestamp: string | null;
  headline: string;
  summary: string;
  sentiment: string;
  category: string;
  severity: string;
  confidence: number;
}

export interface NamedEntities {
  persons: string[];
  organizations: string[];
  locations: string[];
  dates: string[];
  topics: string[];
}

export interface VerifiedClaim {
  claim: string;
  verdict: string;
  confidence: number;
  explanation: string;
  sources: string[];
  yutori_view_url: string | null;
}

export interface IntelligenceFeed {
  video_title: string;
  video_id: string;
  transcript_summary: string;
  events: ExtractedEvent[];
  entities: NamedEntities;
  verified_claims: VerifiedClaim[];
  overall_sentiment: string;
  bias_indicator: string;
  alert_level: string;
  credibility_score: number;
  topic_distribution: Record<string, number>;
  total_stories: number;
  key_quotes: string[];
  broadcast_tags: string[];
  raw_reka: Record<string, unknown>;
}

export interface PipelineStep {
  step: string;
  message: string;
  progress: number;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: "info" | "stream" | "link" | "warn" | "success";
}

export interface YutoriLink {
  task_id: string;
  view_url: string;
  claim: string;
  status: string;
}
