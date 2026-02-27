"use client";

import type { PipelineStep } from "@/types";

const PIPELINE_STAGES = [
  { key: "upload", label: "Upload", icon: "📤" },
  { key: "indexing", label: "Indexing", icon: "🔍" },
  { key: "reka_qa", label: "Reka QA", icon: "🧠" },
  { key: "fastino", label: "Fastino NLP", icon: "🏷️" },
  { key: "yutori", label: "Yutori Verify", icon: "✅" },
  { key: "complete", label: "Done", icon: "🎉" },
];

interface Props {
  steps: PipelineStep[];
}

export default function PipelineProgress({ steps }: Props) {
  const completedSteps = new Set(steps.map((s) => s.step));
  const currentStep = steps.length > 0 ? steps[steps.length - 1].step : null;

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
      <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
        Pipeline Steps
      </h4>
      <div className="space-y-2">
        {PIPELINE_STAGES.map((stage) => {
          const isCompleted = completedSteps.has(stage.key) && stage.key !== currentStep;
          const isCurrent = stage.key === currentStep;
          const stepData = steps.find((s) => s.step === stage.key);

          return (
            <div
              key={stage.key}
              className={`flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg transition-colors ${
                isCurrent
                  ? "bg-blue-500/10 border border-blue-500/20"
                  : isCompleted
                  ? "opacity-70"
                  : "opacity-30"
              }`}
            >
              <span className="text-base w-6 text-center">
                {isCompleted ? (
                  <span className="text-green-400">✓</span>
                ) : isCurrent ? (
                  <span className="animate-spin inline-block">⟳</span>
                ) : (
                  <span className="text-zinc-600">{stage.icon}</span>
                )}
              </span>
              <span
                className={`flex-1 ${
                  isCurrent ? "text-white font-medium" : "text-zinc-400"
                }`}
              >
                {stage.label}
              </span>
              {stepData && (
                <span className="text-[11px] text-zinc-500">
                  {stepData.message.length > 35
                    ? stepData.message.slice(0, 35) + "..."
                    : stepData.message}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
