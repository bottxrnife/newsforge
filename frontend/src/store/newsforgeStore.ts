import { create } from "zustand";
import type {
  ExtractedEvent,
  NamedEntities,
  VerifiedClaim,
  IntelligenceFeed,
  PipelineStep,
  LogEntry,
  YutoriLink,
} from "@/types";

interface NewsForgeState {
  stage: "idle" | "processing" | "done" | "error";
  progress: number;
  steps: PipelineStep[];
  liveLog: LogEntry[];
  youtubeId: string | null;
  videoUrl: string;
  rekaStreams: Record<string, string>;
  yutoriTaskLinks: YutoriLink[];
  events: ExtractedEvent[];
  entities: NamedEntities | null;
  bias: string | null;
  sentiment: string | null;
  claims: VerifiedClaim[];
  feed: IntelligenceFeed | null;
  error: string | null;

  startAnalysis: (videoUrl: string) => void;
  handleSSEEvent: (eventType: string, data: Record<string, unknown>) => void;
  reset: () => void;
}

let logCounter = 0;

function addLog(
  state: Pick<NewsForgeState, "liveLog">,
  message: string,
  type: LogEntry["type"] = "info"
): LogEntry[] {
  const entry: LogEntry = {
    id: `log-${++logCounter}`,
    time: new Date().toLocaleTimeString("en-US", { hour12: false }),
    message,
    type,
  };
  return [...state.liveLog, entry].slice(-200);
}

export const useNewsForgeStore = create<NewsForgeState>((set, get) => ({
  stage: "idle",
  progress: 0,
  steps: [],
  liveLog: [],
  youtubeId: null,
  videoUrl: "",
  rekaStreams: {},
  yutoriTaskLinks: [],
  events: [],
  entities: null,
  bias: null,
  sentiment: null,
  claims: [],
  feed: null,
  error: null,

  startAnalysis: (videoUrl: string) => {
    const ytMatch = videoUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );
    set({
      stage: "processing",
      progress: 0,
      steps: [],
      liveLog: [],
      youtubeId: ytMatch ? ytMatch[1] : null,
      videoUrl,
      rekaStreams: {},
      yutoriTaskLinks: [],
      events: [],
      entities: null,
      bias: null,
      sentiment: null,
      claims: [],
      feed: null,
      error: null,
    });
  },

  handleSSEEvent: (eventType: string, data: Record<string, unknown>) => {
    const state = get();

    switch (eventType) {
      case "status": {
        const step: PipelineStep = {
          step: (data.step as string) || "",
          message: (data.message as string) || "",
          progress: (data.progress as number) || state.progress,
          timestamp: Date.now(),
        };
        set({
          steps: [...state.steps.filter((s) => s.step !== step.step), step],
          progress: step.progress,
          liveLog: addLog(state, step.message, "info"),
        });
        break;
      }

      case "video_uploaded": {
        set({
          liveLog: addLog(state, `Video uploaded: ${data.video_id}`, "success"),
        });
        break;
      }

      case "indexing_tick": {
        const pct = (data.pct as number) || 0;
        set({
          progress: Math.max(state.progress, 10 + pct * 0.15),
        });
        break;
      }

      case "reka_stream": {
        const prompt = (data.prompt as string) || "unknown";
        const chunk = (data.chunk as string) || "";
        set({
          rekaStreams: {
            ...state.rekaStreams,
            [prompt]: (state.rekaStreams[prompt] || "") + " " + chunk,
          },
          liveLog: addLog(state, chunk, "stream"),
        });
        break;
      }

      case "reka_prompt_complete": {
        const prompt = (data.prompt as string) || "";
        const chars = (data.char_count as number) || 0;
        set({
          liveLog: addLog(state, `Reka: "${prompt}" complete (${chars} chars)`, "success"),
        });
        break;
      }

      case "yutori_task_created": {
        const link: YutoriLink = {
          task_id: (data.task_id as string) || "",
          view_url: (data.view_url as string) || "",
          claim: (data.claim as string) || "",
          status: "running",
        };
        set({
          yutoriTaskLinks: [...state.yutoriTaskLinks, link],
          liveLog: addLog(state, `Yutori researching: "${link.claim.slice(0, 60)}..."`, "info"),
        });
        break;
      }

      case "yutori_update": {
        const citations = (data.citations as string[]) || [];
        const content = (data.content as string) || "";
        const newLogs = [...state.liveLog];
        if (content) {
          newLogs.push({
            id: `log-${++logCounter}`,
            time: new Date().toLocaleTimeString("en-US", { hour12: false }),
            message: content.slice(0, 120),
            type: "info",
          });
        }
        for (const url of citations) {
          if (url) {
            newLogs.push({
              id: `log-${++logCounter}`,
              time: new Date().toLocaleTimeString("en-US", { hour12: false }),
              message: `🔗 ${url}`,
              type: "link",
            });
          }
        }
        set({ liveLog: newLogs.slice(-200) });
        break;
      }

      case "fastino_complete": {
        set({
          events: (data.events as ExtractedEvent[]) || [],
          entities: (data.entities as NamedEntities) || null,
          sentiment: (data.sentiment as string) || null,
          bias: (data.bias as string) || null,
          liveLog: addLog(state, `Fastino: ${(data.events as ExtractedEvent[])?.length || 0} events extracted`, "success"),
        });
        break;
      }

      case "yutori_complete": {
        set({
          claims: (data.claims as VerifiedClaim[]) || [],
          liveLog: addLog(state, `Yutori: ${(data.claims as VerifiedClaim[])?.length || 0} claims verified`, "success"),
        });
        break;
      }

      case "complete": {
        set({
          feed: data.feed as IntelligenceFeed,
          stage: "done",
          progress: 100,
          liveLog: addLog(state, "Analysis complete!", "success"),
        });
        break;
      }

      case "error": {
        set({
          error: (data.message as string) || "Unknown error",
          stage: "error",
          liveLog: addLog(state, `Error: ${data.message}`, "warn"),
        });
        break;
      }

      case "log": {
        const logType = (data.type as LogEntry["type"]) || "info";
        set({
          liveLog: addLog(state, (data.message as string) || "", logType),
        });
        break;
      }

      case "ping":
        break;

      default:
        break;
    }
  },

  reset: () => {
    logCounter = 0;
    set({
      stage: "idle",
      progress: 0,
      steps: [],
      liveLog: [],
      youtubeId: null,
      videoUrl: "",
      rekaStreams: {},
      yutoriTaskLinks: [],
      events: [],
      entities: null,
      bias: null,
      sentiment: null,
      claims: [],
      feed: null,
      error: null,
    });
  },
}));
