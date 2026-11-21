import { Sparkles } from "lucide-react";
import clsx from "clsx";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-ivory/60 py-16 px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-oat text-espresso">
        {icon ?? <Sparkles size={22} strokeWidth={1.75} />}
      </div>
      <h3 className="font-heading text-base font-semibold text-coffee">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-grey">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: "completed" | "processing" | "failed" }) {
  const styles = {
    completed: "bg-oat text-espresso",
    processing: "bg-sand text-mocha",
    failed: "bg-[#F4E3DD] text-[#9C4A3A]",
  };
  const labels = { completed: "Processed", processing: "Processing", failed: "Failed" };
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}

export function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-caramel animate-breathe"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="animate-spin text-current"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
