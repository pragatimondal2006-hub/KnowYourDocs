import { Bell, HelpCircle } from "lucide-react";

export default function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-cream/90 px-6 py-4 backdrop-blur-sm">
      <h1 className="font-heading text-lg font-semibold text-coffee">{title}</h1>
      <div className="flex items-center gap-1.5">
        <button
          aria-label="Help"
          className="rounded-lg p-2 text-grey transition-colors hover:bg-oat/70 hover:text-espresso"
        >
          <HelpCircle size={18} />
        </button>
        <button
          aria-label="Notifications"
          className="rounded-lg p-2 text-grey transition-colors hover:bg-oat/70 hover:text-espresso"
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
