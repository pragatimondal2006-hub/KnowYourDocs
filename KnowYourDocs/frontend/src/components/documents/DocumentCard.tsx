import { FileText, Trash2, Download } from "lucide-react";
import { StatusBadge } from "../ui/Primitives";
import type { DocumentStatus } from "../../types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DocumentCard({
  doc,
  onDelete,
  onDownload,
}: {
  doc: DocumentStatus;
  onDelete: (id: string) => void;
  onDownload: (id: string, filename: string) => void;
}) {
  return (
    <div className="nexus-card p-4 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-softer">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-oat text-espresso">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-coffee" title={doc.original_filename}>
              {doc.original_filename}
            </p>
            <p className="mt-0.5 text-xs text-grey">
              {formatSize(doc.size_bytes)} · {formatDate(doc.uploaded_at)}
            </p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {doc.status === "completed" && (
        <p className="mt-3 text-xs text-grey">
          {doc.page_count} page{doc.page_count !== 1 ? "s" : ""} · {doc.chunk_count} indexed chunk
          {doc.chunk_count !== 1 ? "s" : ""}
        </p>
      )}
      {doc.status === "failed" && doc.error_message && (
        <p className="mt-3 text-xs text-[#9C4A3A]">{doc.error_message}</p>
      )}

      <div className="mt-3.5 flex items-center gap-2 border-t border-border pt-3">
        <button
          onClick={() => onDownload(doc.id, doc.original_filename)}
          className="flex items-center gap-1.5 text-xs text-grey hover:text-espresso"
        >
          <Download size={13} /> Download
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          className="flex items-center gap-1.5 text-xs text-grey hover:text-[#9C4A3A]"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}
