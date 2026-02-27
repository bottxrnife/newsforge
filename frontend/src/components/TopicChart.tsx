"use client";

interface Props {
  distribution: Record<string, number>;
}

const topicColors: Record<string, string> = {
  politics: "#3b82f6",
  economy: "#22c55e",
  conflict: "#ef4444",
  science: "#a855f7",
  disaster: "#f59e0b",
  other: "#94a3b8",
};

export default function TopicChart({ distribution }: Props) {
  const entries = Object.entries(distribution).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (entries.length === 0) return null;

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-purple-400">📊</span> Topic Distribution
      </h3>

      {/* Horizontal bar chart */}
      <div className="space-y-3">
        {entries.map(([topic, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          const color = topicColors[topic] || topicColors["other"];

          return (
            <div key={topic}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-300 capitalize">{topic}</span>
                <span className="text-xs text-zinc-500">
                  {count} ({Math.round(pct)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[#1e1e2e]">
        {entries.map(([topic]) => (
          <div key={topic} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: topicColors[topic] || topicColors["other"] }}
            />
            <span className="text-[10px] text-zinc-500 capitalize">{topic}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
