"use client";

import type { NamedEntities } from "@/types";

interface Props {
  entities: NamedEntities;
  bias: string;
  sentiment: string;
}

const typeColors: Record<string, string> = {
  persons: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  organizations: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  locations: "bg-green-500/20 text-green-400 border-green-500/30",
  topics: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  dates: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const typeLabels: Record<string, string> = {
  persons: "👤 People",
  organizations: "🏢 Organizations",
  locations: "📍 Locations",
  topics: "💡 Topics",
  dates: "📅 Dates",
};

export default function EntityMap({ entities, bias, sentiment }: Props) {
  const allEntities = Object.entries(entities).filter(
    ([, items]) => items.length > 0
  );

  if (allEntities.length === 0) return null;

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-purple-400">🏷️</span> Entity Cloud
      </h3>

      <div className="space-y-4">
        {allEntities.map(([type, items]) => (
          <div key={type}>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">
              {typeLabels[type] || type}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(items as string[]).slice(0, 10).map((item, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-1 rounded-md border ${
                    typeColors[type] || typeColors["dates"]
                  }`}
                  style={{
                    fontSize: `${Math.max(10, 13 - i * 0.3)}px`,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Broadcast Profile */}
      <div className="mt-5 pt-4 border-t border-[#1e1e2e]">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">
          Broadcast Profile
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-[#0a0a0f] rounded-lg">
            <p className="text-[10px] text-zinc-500 mb-0.5">Bias</p>
            <p className="text-sm font-medium text-white capitalize">{bias}</p>
          </div>
          <div className="text-center p-2 bg-[#0a0a0f] rounded-lg">
            <p className="text-[10px] text-zinc-500 mb-0.5">Sentiment</p>
            <p className="text-sm font-medium text-white capitalize">
              {sentiment}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
