import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { FileText, CheckCircle2, AlertTriangle, Layers, MessageSquare, Clock } from "lucide-react";
import { api } from "../services/api";
import AppShell from "../components/layout/AppShell";
import { Spinner } from "../components/ui/Primitives";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="nexus-card p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-oat text-espresso">
          <Icon size={16} />
        </div>
        <p className="text-xs text-grey">{label}</p>
      </div>
      <p className="mt-3 font-heading text-2xl font-bold text-coffee tabular-nums">{value}</p>
    </div>
  );
}

export default function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ["analytics"], queryFn: api.analytics, refetchInterval: 15_000 });

  if (isLoading || !data) {
    return (
      <AppShell title="Analytics">
        <div className="flex justify-center py-16 text-grey">
          <Spinner size={22} />
        </div>
      </AppShell>
    );
  }

  const chartData = data.queries_last_7_days.map((d) => ({
    day: new Date(d.date).toLocaleDateString(undefined, { weekday: "short" }),
    queries: d.queries,
  }));

  return (
    <AppShell title="Analytics">
      <div className="space-y-6">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FileText} label="Total documents" value={data.total_documents} />
          <StatCard icon={CheckCircle2} label="Successfully processed" value={data.processed_documents} />
          <StatCard icon={AlertTriangle} label="Failed documents" value={data.failed_documents} />
          <StatCard icon={Layers} label="Indexed chunks" value={data.total_chunks} />
          <StatCard icon={MessageSquare} label="Total queries" value={data.total_queries} />
          <StatCard
            icon={Clock}
            label="Average response time"
            value={data.average_latency_ms !== null ? `${data.average_latency_ms}ms` : "—"}
          />
        </div>

        <div className="nexus-card p-5">
          <p className="mb-4 text-sm font-semibold text-coffee">Queries over the last 7 days</p>
          {data.total_queries === 0 ? (
            <p className="py-10 text-center text-sm text-grey">
              No queries yet. Ask a question in the AI Assistant to see activity here.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4D8C9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#8E8E8E" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#8E8E8E" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#FBF8F3",
                    border: "1px solid #E4D8C9",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="queries" fill="#C8A98A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="nexus-card p-5">
          <p className="mb-3 text-sm font-semibold text-coffee">Recent uploads</p>
          {data.recent_uploads.length === 0 ? (
            <p className="py-6 text-center text-sm text-grey">No documents uploaded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.recent_uploads.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="truncate text-coffee">{d.original_filename}</span>
                  <span className="shrink-0 text-xs text-grey">{new Date(d.uploaded_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
