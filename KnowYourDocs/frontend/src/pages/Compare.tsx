import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GitCompareArrows, AlertCircle } from "lucide-react";
import { api } from "../services/api";
import AppShell from "../components/layout/AppShell";
import { EmptyState, LoadingDots } from "../components/ui/Primitives";
import CitationCard from "../components/chat/CitationCard";

export default function Compare() {
  const { data: docsData } = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });
  const documents = (docsData?.documents ?? []).filter((d) => d.status === "completed");

  const [docA, setDocA] = useState("");
  const [docB, setDocB] = useState("");
  const [focus, setFocus] = useState("");

  const compareMutation = useMutation({
    mutationFn: () => api.compare(docA, docB, focus || undefined),
  });

  const canCompare = docA && docB && docA !== docB;

  if (documents.length < 2) {
    return (
      <AppShell title="Document Comparison">
        <EmptyState
          icon={<GitCompareArrows size={22} />}
          title="Nothing to compare yet"
          description="Upload at least two processed documents in your Knowledge Base, then come back here to compare them."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Document Comparison">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="nexus-card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-coffee">Document A</label>
              <select value={docA} onChange={(e) => setDocA(e.target.value)} className="input-field">
                <option value="">Select a document…</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_filename}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-coffee">Document B</label>
              <select value={docB} onChange={(e) => setDocB(e.target.value)} className="input-field">
                <option value="">Select a document…</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_filename}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-coffee">Focus topic (optional)</label>
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. maternity leave, remote work policy…"
              className="input-field"
            />
          </div>
          <button
            onClick={() => compareMutation.mutate()}
            disabled={!canCompare || compareMutation.isPending}
            className="btn-primary w-full"
          >
            Compare documents
          </button>
        </div>

        {compareMutation.isPending && (
          <div className="flex justify-center py-6">
            <LoadingDots />
          </div>
        )}

        {compareMutation.data && (
          <div className="space-y-4">
            <div className="nexus-card p-5">
              {compareMutation.data.generation_mode === "demo_extractive" && (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-sand px-3 py-2 text-xs text-mocha">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>Demo mode: no ANTHROPIC_API_KEY configured, showing a side-by-side excerpt listing.</span>
                </div>
              )}
              <p className="mb-3 text-sm font-medium text-coffee">
                {compareMutation.data.document_a} vs. {compareMutation.data.document_b}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-coffee/90">
                {compareMutation.data.analysis}
              </p>
            </div>
            {compareMutation.data.citations.length > 0 && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {compareMutation.data.citations.map((c: any) => (
                  <CitationCard key={c.citation_ref + c.document_id} citation={c} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
