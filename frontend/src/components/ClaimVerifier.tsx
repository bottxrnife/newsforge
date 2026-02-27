"use client";

import type { VerifiedClaim } from "@/types";

interface Props {
  claims: VerifiedClaim[];
}

const verdictStyles: Record<string, { bg: string; text: string; label: string }> = {
  verified: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    label: "Verified",
  },
  disputed: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    label: "Disputed",
  },
  unclear: {
    bg: "bg-zinc-500/20",
    text: "text-zinc-400",
    label: "Unclear",
  },
};

export default function ClaimVerifier({ claims }: Props) {
  if (claims.length === 0) return null;

  const sorted = [...claims].sort((a, b) => {
    const order = { verified: 0, disputed: 1, unclear: 2 };
    return (
      (order[a.verdict as keyof typeof order] ?? 2) -
      (order[b.verdict as keyof typeof order] ?? 2)
    );
  });

  const counts = {
    verified: claims.filter((c) => c.verdict === "verified").length,
    disputed: claims.filter((c) => c.verdict === "disputed").length,
    unclear: claims.filter((c) => c.verdict === "unclear").length,
  };

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-green-400">🔍</span> Claim Verification
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-400">{counts.verified} Verified</span>
          <span className="text-zinc-500">·</span>
          <span className="text-red-400">{counts.disputed} Disputed</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-400">{counts.unclear} Unclear</span>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((claim, i) => {
          const style = verdictStyles[claim.verdict] || verdictStyles["unclear"];
          return (
            <div
              key={i}
              className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                {/* Verdict badge */}
                <span
                  className={`${style.bg} ${style.text} text-[10px] font-bold uppercase px-2 py-1 rounded-md whitespace-nowrap mt-0.5`}
                >
                  {style.label}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Claim text */}
                  <p className="text-sm text-white font-medium mb-1">
                    &ldquo;{claim.claim}&rdquo;
                  </p>

                  {/* Explanation */}
                  {claim.explanation && (
                    <p className="text-xs text-zinc-400 mb-2">
                      {claim.explanation}
                    </p>
                  )}

                  {/* Links */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {claim.sources.map((url, j) =>
                      url ? (
                        <a
                          key={j}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                        >
                          🔗 Source {j + 1}
                        </a>
                      ) : null
                    )}
                    {claim.yutori_view_url && (
                      <a
                        href={claim.yutori_view_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                      >
                        🔬 View Research →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
