"use client";

import type { ExtractedEvent } from "@/types";

interface Props {
  events: ExtractedEvent[];
}

const sentimentToScore: Record<string, number> = {
  positive: 1,
  neutral: 0,
  uncertain: -0.3,
  negative: -0.7,
  alarming: -1,
};

const sentimentDotColors: Record<string, string> = {
  positive: "bg-green-400",
  neutral: "bg-zinc-400",
  uncertain: "bg-yellow-400",
  negative: "bg-orange-400",
  alarming: "bg-red-400",
};

export default function SentimentTimeline({ events }: Props) {
  if (events.length === 0) return null;

  const maxScore = 1;
  const minScore = -1;
  const range = maxScore - minScore;

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-green-400">📈</span> Sentiment Timeline
      </h3>

      {/* Y-axis labels + chart */}
      <div className="flex gap-3">
        <div className="flex flex-col justify-between text-[10px] text-zinc-600 py-1">
          <span>Positive</span>
          <span>Neutral</span>
          <span>Negative</span>
        </div>

        <div className="flex-1 relative h-32 border-l border-b border-zinc-800">
          {/* Grid lines */}
          <div className="absolute top-0 left-0 right-0 border-t border-zinc-800/50 border-dashed" />
          <div className="absolute top-1/2 left-0 right-0 border-t border-zinc-800/50 border-dashed" />
          <div className="absolute bottom-0 left-0 right-0" />

          {/* Dots + connecting lines */}
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${events.length * 100} 100`}
          >
            {events.length > 1 &&
              events.map((event, i) => {
                if (i === 0) return null;
                const prevScore = sentimentToScore[events[i - 1].sentiment] ?? 0;
                const currScore = sentimentToScore[event.sentiment] ?? 0;
                const x1 = ((i - 1) / (events.length - 1)) * events.length * 100;
                const y1 = ((maxScore - prevScore) / range) * 100;
                const x2 = (i / (events.length - 1)) * events.length * 100;
                const y2 = ((maxScore - currScore) / range) * 100;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#3f3f46"
                    strokeWidth="2"
                  />
                );
              })}
          </svg>

          {/* Event dots */}
          {events.map((event, i) => {
            const score = sentimentToScore[event.sentiment] ?? 0;
            const leftPct =
              events.length === 1
                ? 50
                : (i / (events.length - 1)) * 100;
            const topPct = ((maxScore - score) / range) * 100;

            return (
              <div
                key={i}
                className="absolute group"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    sentimentDotColors[event.sentiment] || "bg-zinc-400"
                  } ring-2 ring-[#111118] cursor-pointer hover:scale-150 transition-transform`}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                    <p className="text-white font-medium">
                      {event.headline.slice(0, 40)}
                      {event.headline.length > 40 ? "..." : ""}
                    </p>
                    <p className="text-zinc-400 capitalize">
                      {event.sentiment} · {event.timestamp || `Event ${i + 1}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 pl-12 text-[10px] text-zinc-600">
        {events.map((event, i) => (
          <span key={i} className="truncate max-w-[80px]">
            {event.timestamp || `E${i + 1}`}
          </span>
        ))}
      </div>
    </div>
  );
}
