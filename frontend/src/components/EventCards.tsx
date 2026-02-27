"use client";

import type { ExtractedEvent } from "@/types";

interface Props {
  events: ExtractedEvent[];
}

const categoryColors: Record<string, string> = {
  politics: "bg-blue-500/20 text-blue-400",
  economy: "bg-green-500/20 text-green-400",
  conflict: "bg-red-500/20 text-red-400",
  science: "bg-purple-500/20 text-purple-400",
  disaster: "bg-orange-500/20 text-orange-400",
  other: "bg-zinc-500/20 text-zinc-400",
};

const sentimentColors: Record<string, string> = {
  positive: "text-green-400",
  negative: "text-red-400",
  neutral: "text-zinc-400",
  alarming: "text-orange-400",
  uncertain: "text-yellow-400",
};

const severityBars: Record<string, string> = {
  low: "w-1/3 bg-green-500",
  medium: "w-2/3 bg-yellow-500",
  high: "w-full bg-red-500",
};

export default function EventCards({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-blue-400">📰</span> News Events
        <span className="text-xs text-zinc-500 font-normal ml-auto">
          {events.length} stories
        </span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {events.map((event, i) => (
          <div
            key={i}
            className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-4 hover:border-zinc-600 transition-colors group"
          >
            {/* Top badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                  categoryColors[event.category] || categoryColors["other"]
                }`}
              >
                {event.category}
              </span>
              <span
                className={`text-[10px] capitalize ${
                  sentimentColors[event.sentiment] || "text-zinc-400"
                }`}
              >
                {event.sentiment}
              </span>
              {event.timestamp && (
                <span className="text-[10px] text-zinc-600 ml-auto">
                  {event.timestamp}
                </span>
              )}
            </div>

            {/* Headline */}
            <h4 className="text-sm font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
              {event.headline}
            </h4>

            {/* Summary */}
            <p className="text-xs text-zinc-400 leading-relaxed mb-2">
              {event.summary}
            </p>

            {/* Severity bar */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Severity</span>
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    severityBars[event.severity] || severityBars["medium"]
                  }`}
                />
              </div>
              <span className="text-[10px] text-zinc-600 capitalize">
                {event.severity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
