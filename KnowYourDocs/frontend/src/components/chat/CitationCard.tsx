import { FileText } from "lucide-react";
import type { Citation } from "../../types";

export default function CitationCard({ citation }: { citation: Citation }) {
  return (
    <div className="nexus-card p-3.5 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-softer hover:border-caramel/60">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-oat text-espresso">
          <FileText size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-coffee" title={citation.document_name}>
              {citation.document_name}
            </p>
            <span className="shrink-0 text-xs font-medium text-grey">{citation.citation_ref}</span>
          </div>
          <p className="mt-0.5 text-xs text-grey">
            Page {citation.page_number} · {Math.round(citation.similarity_score * 100)}% match
          </p>
          <p className="mt-2 text-sm leading-relaxed text-coffee/80">{citation.excerpt}</p>
        </div>
      </div>
    </div>
  );
}
