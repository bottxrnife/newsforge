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
      {/* Left: Video Preview & Progress */}
      <div className="space-y-4">
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl overflow-hidden shadow-lg">
          {youtubeId ? (
            <div className="aspect-video relative">
              <iframe
                src={getYoutubeEmbedUrl(youtubeId)}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Video Preview"
              />
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-white tracking-wide uppercase">Analyzing</span>
              </div>
            </div>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center bg-zinc-900/50">
              <div className="text-4xl mb-4 opacity-50">📹</div>
              <p className="text-zinc-400 font-medium mb-1">
                {videoUrl ? "Loading Video..." : "No Video Selected"}
              </p>
              <p className="text-zinc-600 text-xs mt-1 max-w-xs mx-auto truncate px-4">
                {videoUrl}
              </p>
            </div>
          )}
          <div className="px-4 py-3 bg-[#0a0a0f] border-t border-[#1e1e2e] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm text-zinc-300 font-medium">
              {currentStep?.message || "Preparing analysis pipeline..."}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-zinc-200">
              Pipeline Progress
            </span>
            <span className="text-xl font-bold text-white">{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden border border-[#1e1e2e]">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right: Live Intelligence Terminal */}
      <div className="space-y-4">
        <PipelineProgress steps={steps} />

        {/* Clean Log */}
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl overflow-hidden shadow-lg flex flex-col h-64">
          <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center justify-between bg-[#0a0a0f]">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Processing Log
            </span>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">
              {liveLog.length} events
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 text-sm font-mono leading-relaxed bg-[#0a0a0f]">
            {liveLog.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-600">
                Waiting for events...
              </div>
            ) : (
              <div className="space-y-2">
                {liveLog.map((entry) => (
                  <div key={entry.id} className="flex items-start text-zinc-300">
                    <span className="text-zinc-600 mr-3 shrink-0 text-xs mt-0.5">
                      {entry.time}
                    </span>
                    <span className="mr-2 shrink-0">
                      {entry.type === 'info' && <span className="text-blue-400">ℹ</span>}
                      {entry.type === 'success' && <span className="text-green-400">✓</span>}
                      {entry.type === 'warn' && <span className="text-yellow-400">⚠</span>}
                      {entry.type === 'stream' && <span className="text-purple-400">⚡</span>}
                      {entry.type === 'link' && <span className="text-cyan-400">🔗</span>}
                    </span>
                    {entry.type === "link" ? (
                      <a
                        href={entry.message.replace("🔗 ", "")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline break-all"
                      >
                        {entry.message}
                      </a>
                    ) : (
                      <span className="break-words">
                        {entry.type === 'stream' ? (
                          <span className="text-zinc-400 italic">"{entry.message}"</span>
                        ) : (
                          entry.message
                        )}
                      </span>
                    )}
                  </div>
                ))}
                {progress < 100 && (
                  <div className="flex items-center gap-2 text-zinc-500 pt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
                    <span className="text-xs italic">Processing...</span>
                  </div>
                )}
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Yutori Research Sources */}
        {yutoriTaskLinks.length > 0 && (
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 shadow-lg animate-slide-in">
            <h4 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
              Deep Web Verification
            </h4>
            
            <div className="space-y-3">
              {yutoriTaskLinks.map((link) => (
                <div
                  key={link.task_id}
                  className="bg-[#0a0a0f] border border-[#1e1e2e] p-3 rounded-lg flex items-start gap-3"
                >
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-sm mb-2">
                      {link.claim}
                    </p>
                    {link.view_url ? (
                      <a
                        href={link.view_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                      >
                        View Verification Run →
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-500 italic">
                        Initializing agents...
                      </span>
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
