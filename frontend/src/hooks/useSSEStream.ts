"use client";
import { useCallback, useRef } from "react";
import { useNewsForgeStore } from "@/store/newsforgeStore";

export function useSSEStream() {
  const handleSSEEvent = useNewsForgeStore((s) => s.handleSSEEvent);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const startStream = useCallback(
    async (body: Record<string, string>) => {
      // Cancel any existing stream
      if (readerRef.current) {
        try { await readerRef.current.cancel(); } catch {}
      }

      // We add a simulated "starting" event immediately so the UI reacts instantly
      handleSSEEvent("status", {
        step: "upload",
        message: "Initiating connection to Reka Vision...",
        progress: 1,
      });

      // Direct fetch to FastAPI to avoid Next.js proxy buffering
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const resp = await fetch(`${backendUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok || !resp.body) {
        handleSSEEvent("error", { message: `HTTP ${resp.status}: ${resp.statusText}` });
        return;
      }

      const reader = resp.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events: split on double newline (handles both \n\n and \r\n\r\n)
          const parts = buffer.split(/\r?\n\r?\n/);
          buffer = parts.pop() || "";

          for (const part of parts) {
            if (!part.trim()) continue;

            let eventType = "message";
            let eventData = "";

            for (const line of part.split(/\r?\n/)) {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                eventData = line.slice(5).trim();
              }
            }

            if (eventData) {
              try {
                const parsed = JSON.parse(eventData);
                handleSSEEvent(eventType, parsed);
              } catch {
                // non-JSON data, ignore
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleSSEEvent("error", { message: `Stream error: ${err}` });
        }
      }
    },
    [handleSSEEvent]
  );

  const cancelStream = useCallback(async () => {
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch {}
      readerRef.current = null;
    }
  }, []);

  return { startStream, cancelStream };
}
