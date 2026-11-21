import { useQuery } from "@tanstack/react-query";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../hooks/useAuth";
import { EmptyState } from "../components/ui/Primitives";
import { Users as UsersIcon, ShieldAlert } from "lucide-react";

export default function Users() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const token = localStorage.getItem("nexus_ai_token");
      const res = await fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load users.");
      return res.json();
    },
    enabled: user?.role === "Administrator",
  });

  if (user?.role !== "Administrator") {
    return (
      <AppShell title="Users & Access">
        <EmptyState
          icon={<ShieldAlert size={22} />}
          title="Administrator access required"
          description="Only Administrators can view and manage users. Contact your workspace admin if you need access."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Users & Access">
      <div className="nexus-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-center text-sm text-grey">Loading users…</p>
        ) : error ? (
          <p className="p-6 text-center text-sm text-[#9C4A3A]">Could not load users.</p>
        ) : data.length === 0 ? (
          <EmptyState icon={<UsersIcon size={22} />} title="No users yet" description="Users will appear here once they register." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-grey">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u: any) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-oat/20">
                  <td className="px-4 py-3 font-medium text-coffee">{u.name}</td>
                  <td className="px-4 py-3 text-grey">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-oat px-2.5 py-1 text-xs font-medium text-espresso">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-grey">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
