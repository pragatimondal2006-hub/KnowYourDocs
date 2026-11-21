import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List as ListIcon, Library } from "lucide-react";
import clsx from "clsx";
import { api } from "../services/api";
import AppShell from "../components/layout/AppShell";
import UploadZone from "../components/documents/UploadZone";
import DocumentCard from "../components/documents/DocumentCard";
import { EmptyState, StatusBadge } from "../components/ui/Primitives";

export default function Documents() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"grid" | "table">("grid");

  const { data, isLoading } = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadDocument(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      await uploadMutation.mutateAsync(file);
    }
  };

  const handleDownload = (id: string, filename: string) => {
    api.downloadDocument(id, filename).catch(() => undefined);
  };

  const documents = data?.documents ?? [];

  return (
    <AppShell title="Knowledge Base">
      <div className="space-y-6">
        <UploadZone onFilesSelected={handleFiles} isUploading={uploadMutation.isPending} />

        {!isLoading && documents.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-grey">
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-ivory p-1">
              <button
                onClick={() => setView("grid")}
                className={clsx("rounded-md p-1.5", view === "grid" ? "bg-oat text-espresso" : "text-grey")}
                aria-label="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setView("table")}
                className={clsx("rounded-md p-1.5", view === "table" ? "bg-oat text-espresso" : "text-grey")}
                aria-label="Table view"
              >
                <ListIcon size={14} />
              </button>
            </div>
          </div>
        )}

        {!isLoading && documents.length === 0 && (
          <EmptyState
            icon={<Library size={22} />}
            title="No documents here yet"
            description="Your knowledge library is waiting for its first document. Upload a PDF above to get started."
          />
        )}

        {view === "grid" && documents.length > 0 && (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDelete={(id) => deleteMutation.mutate(id)}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}

        {view === "table" && documents.length > 0 && (
          <div className="nexus-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-grey">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Pages</th>
                  <th className="px-4 py-3">Chunks</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-oat/20">
                    <td className="max-w-[240px] truncate px-4 py-3 font-medium text-coffee">
                      {doc.original_filename}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-grey">{doc.page_count}</td>
                    <td className="px-4 py-3 text-grey">{doc.chunk_count}</td>
                    <td className="px-4 py-3 text-grey">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(doc.id)}
                        className="text-xs text-grey hover:text-[#9C4A3A]"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
