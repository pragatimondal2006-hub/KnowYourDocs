import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sparkles, Library, Search, FileText, Layers, MessageSquare, ArrowRight } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import AppShell from "../components/layout/AppShell";
import { EmptyState } from "../components/ui/Primitives";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: docsData } = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });
  const { data: analytics } = useQuery({ queryKey: ["analytics"], queryFn: api.analytics });

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hasDocuments = (docsData?.total ?? 0) > 0;

  return (
    <AppShell title="Overview">
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-xl font-bold text-coffee">Welcome back, {firstName}</h2>
          <p className="mt-1 text-sm text-grey">Here's what's happening in your knowledge workspace.</p>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <div className="nexus-card p-4">
            <div className="flex items-center gap-2.5 text-grey">
              <FileText size={16} />
              <span className="text-xs">Documents</span>
            </div>
            <p className="mt-2 font-heading text-2xl font-bold text-coffee tabular-nums">
              {analytics?.total_documents ?? "—"}
            </p>
          </div>
          <div className="nexus-card p-4">
            <div className="flex items-center gap-2.5 text-grey">
              <Layers size={16} />
              <span className="text-xs">Indexed chunks</span>
            </div>
            <p className="mt-2 font-heading text-2xl font-bold text-coffee tabular-nums">
              {analytics?.total_chunks ?? "—"}
            </p>
          </div>
          <div className="nexus-card p-4">
            <div className="flex items-center gap-2.5 text-grey">
              <MessageSquare size={16} />
              <span className="text-xs">Questions answered</span>
            </div>
            <p className="mt-2 font-heading text-2xl font-bold text-coffee tabular-nums">
              {analytics?.total_queries ?? "—"}
            </p>
          </div>
        </div>

        {!hasDocuments ? (
          <EmptyState
            icon={<Library size={22} />}
            title="Your knowledge library is waiting for its first document"
            description="Upload employee handbooks, policies, reports or any PDF, and NEXUS AI will let you ask questions about them in plain language."
            action={
              <Link to="/knowledge-base" className="btn-primary">
                Upload your first document
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Link
              to="/assistant"
              className="nexus-card group flex items-center justify-between p-5 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-softer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-oat text-espresso">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="font-medium text-coffee">Ask the AI Assistant</p>
                  <p className="text-xs text-grey">Get grounded answers with citations</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-grey transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/search"
              className="nexus-card group flex items-center justify-between p-5 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-softer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-oat text-espresso">
                  <Search size={18} />
                </div>
                <div>
                  <p className="font-medium text-coffee">Search your knowledge base</p>
                  <p className="text-xs text-grey">Find relevant passages instantly</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-grey transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
