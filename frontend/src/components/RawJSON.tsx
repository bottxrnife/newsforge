"use client";

import { useState } from "react";
import type { IntelligenceFeed } from "@/types";

interface Props {
  data: IntelligenceFeed;
}

export default function RawJSON({ data }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonStr = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-[#151520] transition-colors"
      >
        <span className="text-sm font-medium text-zinc-400 flex items-center gap-2">
          <span>🔧</span>
          {open ? "Hide" : "Show"} Raw JSON
        </span>
        <span className="text-zinc-600 text-xs">
          {(jsonStr.length / 1024).toFixed(1)} KB
        </span>
      </button>

      {open && (
        <div className="border-t border-[#1e1e2e]">
          <div className="flex justify-end px-4 py-2 border-b border-[#1e1e2e]">
            <button
              onClick={handleCopy}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {copied ? "✓ Copied!" : "Copy to Clipboard"}
            </button>
          </div>
          <pre className="p-4 text-xs text-zinc-400 overflow-x-auto max-h-96 overflow-y-auto log-terminal">
            {jsonStr}
          </pre>
        </div>
      )}
    </div>
  );
}
