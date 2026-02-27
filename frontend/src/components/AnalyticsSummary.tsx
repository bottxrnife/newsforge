"use client";

import type { IntelligenceFeed } from "@/types";

interface Props {
  feed: IntelligenceFeed;
}

const alertColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const sentimentEmoji: Record<string, string> = {
  positive: "😊",
  negative: "😟",
  neutral: "😐",
  alarming: "🚨",
  uncertain: "🤔",
  mixed: "🔀",
};

const biasLabels: Record<string, { label: string; position: string }> = {
  "left-leaning": { label: "Left", position: "left-[15%]" },
  center: { label: "Center", position: "left-[50%]" },
  "right-leaning": { label: "Right", position: "left-[85%]" },
  unclear: { label: "Unclear", position: "left-[50%]" },
};

export default function AnalyticsSummary({ feed }: Props) {
  const totalEntities =
    feed.entities.persons.length +
    feed.entities.organizations.length +
    feed.entities.locations.length;

  const verifiedCount = feed.verified_claims.filter(
    (c) => c.verdict === "verified"
  ).length;
  const totalClaims = feed.verified_claims.length;

  const biasInfo = biasLabels[feed.bias_indicator] || biasLabels["unclear"];
  const filledStars = Math.round(feed.credibility_score);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Alert Level */}
      <div
        className={`rounded-xl border p-4 ${
          alertColors[feed.alert_level] || alertColors["low"]
        }`}
      >
        <p className="text-[11px] uppercase tracking-wider opacity-70 mb-1">
          Alert Level
        </p>
        <p className="text-2xl font-bold uppercase">{feed.alert_level}</p>
      </div>

      {/* Stories Found */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
          📰 Stories
        </p>
        <p className="text-3xl font-bold text-white">{feed.total_stories}</p>
      </div>

      {/* Entities Detected */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
          🏷️ Entities
        </p>
        <p className="text-3xl font-bold text-white">{totalEntities}</p>
      </div>

      {/* Claims Verified */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
          ✅ Claims Verified
        </p>
        <p className="text-2xl font-bold text-white">
          {verifiedCount}
          <span className="text-base text-zinc-500">/{totalClaims}</span>
        </p>
        {totalClaims > 0 && (
          <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{
                width: `${(verifiedCount / totalClaims) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Media Bias */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4 col-span-2 md:col-span-1">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
          ⚖️ Media Bias
        </p>
        <div className="relative h-4 bg-gradient-to-r from-blue-600 via-zinc-500 to-red-600 rounded-full">
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg ${biasInfo.position}`}
          />
        </div>
        <p className="text-xs text-zinc-400 mt-1.5 text-center">
          {biasInfo.label}
        </p>
      </div>

      {/* Credibility Score */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
          ⭐ Credibility
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">
            {feed.credibility_score.toFixed(1)}
          </span>
          <span className="text-sm text-zinc-500">/10</span>
        </div>
        <div className="flex gap-0.5 mt-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-sm ${
                i < filledStars ? "bg-amber-400" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Topic Mix */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
          📊 Topics
        </p>
        <div className="space-y-1">
          {Object.entries(feed.topic_distribution)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([topic, count]) => (
              <div key={topic} className="flex items-center gap-2 text-xs">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      topic === "politics"
                        ? "#3b82f6"
                        : topic === "economy"
                        ? "#22c55e"
                        : topic === "conflict"
                        ? "#ef4444"
                        : topic === "science"
                        ? "#a855f7"
                        : topic === "disaster"
                        ? "#f59e0b"
                        : "#94a3b8",
                  }}
                />
                <span className="text-zinc-400 capitalize">{topic}</span>
                <span className="text-zinc-600 ml-auto">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Broadcast Mood */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
          💬 Mood
        </p>
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {sentimentEmoji[feed.overall_sentiment] || "😐"}
          </span>
          <span className="text-lg font-medium text-white capitalize">
            {feed.overall_sentiment}
          </span>
        </div>
      </div>
    </div>
  );
}
