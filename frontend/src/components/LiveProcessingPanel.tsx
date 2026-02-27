"use client";

import { useEffect, useRef } from "react";
import { useNewsForgeStore } from "@/store/newsforgeStore";
import { getYoutubeEmbedUrl } from "@/hooks/useVideoEmbed";
import PipelineProgress from "./PipelineProgress";

export default function LiveProcessingPanel() {
  const {
    progress,
    liveLog,
    youtubeId,
    videoUrl,
    yutoriTaskLinks,
    steps,
  } = useNewsForgeStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveLog]);

  const currentStep = steps.length > 0 ? steps[steps.length - 1] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in">
      {/* Left: Video Preview */}
      <div className="space-y-4">
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl overflow-hidden">
          {youtubeId ? (
            <div className="aspect-video">
              <iframe
                src={getYoutubeEmbedUrl(youtubeId)}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Video Preview"
              />
            </div>
          ) : (
            <div className="aspect-video flex items-center justify-center bg-zinc-900">
              <div className="text-center">
                <div className="text-4xl mb-2">📹</div>
                <p className="text-zinc-500 text-sm">
                  {videoUrl ? "Processing video..." : "No video preview available"}
                </p>
                <p className="text-zinc-600 text-xs mt-1 max-w-xs mx-auto truncate">
                  {videoUrl}
                </p>
              </div>
            </div>
          )}
          <div className="px-4 py-3 border-t border-[#1e1e2e] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-glow" />
            <span className="text-xs text-zinc-400">
              {currentStep?.message || "Reka Vision AI analyzing..."}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-300">
              Pipeline Progress
            </span>
            <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full progress-bar rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {currentStep?.message || "Starting analysis..."}
          </p>
        </div>
      </div>

      {/* Right: Live Intelligence Terminal */}
      <div className="space-y-4">
        {/* Pipeline Steps */}
        <PipelineProgress steps={steps} />

        {/* Live Log */}
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-[#1e1e2e] flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Live Processing Log
            </span>
            <span className="text-xs text-zinc-600">{liveLog.length} entries</span>
          </div>
          <div className="h-64 overflow-y-auto p-3 log-terminal">
            {liveLog.length === 0 ? (
              <p className="text-zinc-600 text-xs">Waiting for pipeline events...</p>
            ) : (
              liveLog.map((entry) => (
                <div key={entry.id} className={`log-${entry.type} mb-0.5`}>
                  <span className="text-zinc-600 mr-2">{entry.time}</span>
                  <span className="text-zinc-500 mr-1">
                    [{entry.type.toUpperCase().padEnd(7)}]
                  </span>
                  {entry.type === "link" ? (
                    <a
                      href={entry.message.replace("🔗 ", "")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:underline"
                    >
                      {entry.message}
                    </a>
                  ) : (
                    <span>{entry.message}</span>
                  )}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Yutori Research Sources */}
        {yutoriTaskLinks.length > 0 && (
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Yutori Research Sources
            </h4>
            <div className="space-y-2">
              {yutoriTaskLinks.map((link) => (
                <div
                  key={link.task_id}
                  className="flex items-start gap-2 text-xs"
                >
                  <span className="text-green-400 mt-0.5">●</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 truncate">{link.claim}</p>
                    {link.view_url && (
                      <a
                        href={link.view_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline text-[11px]"
                      >
                        🔗 View Live Research →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
