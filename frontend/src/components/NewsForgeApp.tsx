"use client";

import { useNewsForgeStore } from "@/store/newsforgeStore";
import VideoInput from "./VideoInput";
import LiveProcessingPanel from "./LiveProcessingPanel";
import AnalyticsSummary from "./AnalyticsSummary";
import EventCards from "./EventCards";
import EntityMap from "./EntityMap";
import SentimentTimeline from "./SentimentTimeline";
import ClaimVerifier from "./ClaimVerifier";
import TopicChart from "./TopicChart";
import RawJSON from "./RawJSON";
import { Toaster } from "sonner";

export default function NewsForgeApp() {
  const stage = useNewsForgeStore((s) => s.stage);
  const feed = useNewsForgeStore((s) => s.feed);
  const error = useNewsForgeStore((s) => s.error);
  const reset = useNewsForgeStore((s) => s.reset);

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" theme="dark" />

      {/* Header */}
      <header className="border-b border-[#1e1e2e] bg-[#0d0d14]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse-glow" />
            <h1 className="text-xl font-bold tracking-tight">
              News<span className="text-red-500">Forge</span>
            </h1>
            <span className="text-xs text-zinc-500 hidden sm:inline">
              Autonomous AI News Intelligence
            </span>
          </div>
          {stage !== "idle" && (
            <button
              onClick={reset}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
            >
              New Analysis
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Idle: Show input form */}
        {stage === "idle" && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">
                Analyze Any News Broadcast
              </h2>
              <p className="text-zinc-400 text-lg">
                Paste a video URL and let our AI pipeline extract events,
                entities, sentiment, and verify claims — fully autonomously.
              </p>
            </div>
            <VideoInput />
          </div>
        )}

        {/* Processing: Show live panel */}
        {stage === "processing" && <LiveProcessingPanel />}

        {/* Error */}
        {stage === "error" && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <p className="text-red-400 text-lg font-medium mb-2">
                Analysis Error
              </p>
              <p className="text-zinc-400 mb-4">{error}</p>
              <button
                onClick={reset}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
            <div className="mt-6">
              <LiveProcessingPanel />
            </div>
          </div>
        )}

        {/* Done: Show full dashboard */}
        {stage === "done" && feed && (
          <div className="space-y-6 animate-slide-in">
            {/* Title */}
            <div className="text-center mb-2">
              <h2 className="text-2xl font-bold">{feed.video_title}</h2>
              <p className="text-zinc-500 text-sm mt-1">
                {feed.total_stories} stories · {feed.entities.persons.length + feed.entities.organizations.length + feed.entities.locations.length} entities · {feed.verified_claims.length} claims verified
              </p>
            </div>

            {/* Analytics Summary Cards */}
            <AnalyticsSummary feed={feed} />

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Events + Sentiment */}
              <div className="lg:col-span-2 space-y-6">
                <EventCards events={feed.events} />
                {feed.events.length > 0 && (
                  <SentimentTimeline events={feed.events} />
                )}
              </div>

              {/* Right: Entities + Topics */}
              <div className="space-y-6">
                <EntityMap
                  entities={feed.entities}
                  bias={feed.bias_indicator}
                  sentiment={feed.overall_sentiment}
                />
                <TopicChart distribution={feed.topic_distribution} />
              </div>
            </div>

            {/* Claims Verification */}
            {feed.verified_claims.length > 0 && (
              <ClaimVerifier claims={feed.verified_claims} />
            )}

            {/* Key Quotes */}
            {feed.key_quotes.length > 0 && (
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="text-amber-400">💬</span> Key Quotes
                </h3>
                <div className="space-y-3">
                  {feed.key_quotes.map((q, i) => (
                    <blockquote
                      key={i}
                      className="border-l-2 border-amber-500/50 pl-4 text-zinc-300 italic text-sm"
                    >
                      &ldquo;{q}&rdquo;
                    </blockquote>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON */}
            <RawJSON data={feed} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] mt-12 py-4 text-center text-xs text-zinc-600">
        NewsForge — Built with Reka Vision, Fastino GLiNER 2, and Yutori Research
      </footer>
    </div>
  );
}
