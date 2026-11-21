import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  Library,
  Search,
  GitCompareArrows,
  BarChart3,
  Users,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import clsx from "clsx";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/knowledge-base", label: "Knowledge Base", icon: Library },
  { to: "/search", label: "Smart Search", icon: Search },
  { to: "/compare", label: "Document Comparison", icon: GitCompareArrows },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const ADMIN_ITEMS = [{ to: "/users", label: "Users & Access", icon: Users }];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-ivory">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-espresso text-ivory font-heading font-bold text-sm">
          K
        </div>
        <div>
          <p className="font-heading font-bold text-coffee text-sm leading-tight">KnowYourDocs</p>
          <p className="text-[11px] text-grey leading-tight">Big Docs,Less Time!</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => clsx("nav-item", isActive && "nav-item-active")}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}

        {user?.role === "Administrator" && (
          <>
            <div className="pt-4 pb-1 px-3.5 text-[11px] font-semibold text-grey">Administration</div>
            {ADMIN_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => clsx("nav-item", isActive && "nav-item-active")}>
                <Icon size={18} strokeWidth={2} />
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}

        <NavLink to="/settings" className={({ isActive }) => clsx("nav-item", isActive && "nav-item-active")}>
          <SettingsIcon size={18} strokeWidth={2} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-oat text-espresso font-heading font-semibold text-xs">
            {user?.name?.slice(0, 2).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-coffee">{user?.name}</p>
            <p className="truncate text-[11px] text-grey">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            className="rounded-lg p-1.5 text-grey transition-colors hover:bg-oat hover:text-espresso"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
