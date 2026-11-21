import { Check, X, Minus } from "lucide-react";
import clsx from "clsx";
import type { PipelineStage } from "../../types";

const STAGE_LABELS: Record<string, string> = {
  query_received: "Query received",
  intent_understood: "Intent understood",
  knowledge_base_searched: "Knowledge base searched",
  chunks_retrieved: "Relevant chunks retrieved",
  context_assembled: "Context assembled",
  llm_response_generated: "Response generated",
  citations_prepared: "Citations prepared",
  response_delivered: "Response delivered",
};

export default function PipelineTimeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="nexus-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-grey">Processing timeline</p>
      <ol className="space-y-0">
        {stages.map((stage, i) => (
          <li key={stage.stage} className="relative flex gap-3 pb-4 last:pb-0">
            {i < stages.length - 1 && (
              <span className="absolute left-[11px] top-6 bottom-0 w-px bg-border" aria-hidden />
            )}
            <span
              className={clsx(
                "relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full",
                stage.status === "completed" && "bg-caramel text-ivory",
                stage.status === "skipped" && "bg-sand text-mocha",
                stage.status === "error" && "bg-[#E3A79A] text-ivory"
              )}
            >
              {stage.status === "completed" && <Check size={12} strokeWidth={3} />}
              {stage.status === "skipped" && <Minus size={12} strokeWidth={3} />}
              {stage.status === "error" && <X size={12} strokeWidth={3} />}
            </span>
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-medium text-coffee">{STAGE_LABELS[stage.stage] ?? stage.stage}</p>
              {stage.detail && <p className="mt-0.5 text-xs text-grey">{stage.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
