import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { api } from "../services/api";
import AppShell from "../components/layout/AppShell";
import { EmptyState, LoadingDots } from "../components/ui/Primitives";
import type { SearchResultItem } from "../types";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [tookMs, setTookMs] = useState<number | null>(null);

  const searchMutation = useMutation({
    mutationFn: (q: string) => api.search(q),
    onSuccess: (data) => {
      setResults(data.results);
      setTookMs(data.took_ms);
    },
  });

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    searchMutation.mutate(query);
  };

  return (
    <AppShell title="Smart Search">
      <div className="mx-auto max-w-3xl space-y-6">
        <form onSubmit={runSearch} className="flex items-center gap-2.5 nexus-card p-2.5">
          <SearchIcon size={18} className="ml-2 shrink-0 text-grey" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across your knowledge base by meaning, not just keywords…"
            className="flex-1 bg-transparent px-1 py-2 text-sm text-coffee placeholder:text-grey/70 focus:outline-none"
          />
          <button type="submit" disabled={!query.trim() || searchMutation.isPending} className="btn-primary px-4">
            Search
          </button>
        </form>

        {searchMutation.isPending && (
          <div className="flex justify-center py-6">
            <LoadingDots />
          </div>
        )}

        {!searchMutation.isPending && results !== null && (
          <>
            <p className="text-xs text-grey">
              {results.length} result{results.length !== 1 ? "s" : ""}
              {tookMs !== null && ` · ${tookMs}ms`}
            </p>
            {results.length === 0 ? (
              <EmptyState
                title="No matching results"
                description="Try rephrasing your query, or upload more documents to expand your knowledge base."
              />
            ) : (
              <div className="space-y-3">
                {results.map((r) => (
                  <div key={r.chunk_id} className="nexus-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-coffee">{r.document_name}</p>
                      <span className="text-xs text-grey">
                        Page {r.page_number} · {Math.round(r.similarity_score * 100)}% match
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-coffee/80">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {results === null && !searchMutation.isPending && (
          <EmptyState
            title="Nothing searched yet"
            description="Enter a question or topic above to retrieve the most relevant passages from your documents, ranked by semantic similarity."
          />
        )}
      </div>
    </AppShell>
  );
}
