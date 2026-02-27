"use client";

import { useState } from "react";
import { useNewsForgeStore } from "@/store/newsforgeStore";
import { useSSEStream } from "@/hooks/useSSEStream";
import { toast } from "sonner";

export default function VideoInput() {
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const startAnalysis = useNewsForgeStore((s) => s.startAnalysis);
  const { startStream } = useSSEStream();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) {
      toast.error("Please enter a video URL");
      return;
    }

    setSubmitting(true);
    startAnalysis(videoUrl);
    
    // We only need to send the video_url. 
    // The backend will automatically use the API keys from its .env file.
    await startStream({
      video_url: videoUrl,
    });
    
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Video URL */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          News Video URL
        </label>
        <div className="relative">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-5 py-4 bg-[#111118] border border-[#1e1e2e] rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-colors shadow-inner"
            disabled={submitting}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-2 ml-1">
          YouTube, MP4, or any video URL supported by Reka Vision
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !videoUrl}
        className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl text-white font-semibold text-lg transition-colors flex items-center justify-center gap-3 shadow-lg hover:shadow-red-600/20"
      >
        {submitting && (
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
        )}
        {submitting ? "Analyzing Broadcast..." : "Analyze Broadcast"}
      </button>
    </form>
  );
}

