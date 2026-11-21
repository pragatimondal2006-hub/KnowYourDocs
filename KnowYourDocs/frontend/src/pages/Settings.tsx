import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import AppShell from "../components/layout/AppShell";

function Toggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(!!defaultChecked);
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="pr-6">
        <p className="text-sm font-medium text-coffee">{label}</p>
        <p className="mt-0.5 text-xs text-grey">{description}</p>
      </div>
      <button
        onClick={() => setChecked((c) => !c)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-espresso" : "bg-taupe"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-ivory shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="nexus-card p-5">
          <p className="mb-4 text-sm font-semibold text-coffee">Profile</p>
          <div className="space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-grey">Name</label>
              <input className="input-field" defaultValue={user?.name} disabled />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-grey">Email</label>
              <input className="input-field" defaultValue={user?.email} disabled />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-grey">Role</label>
              <input className="input-field" defaultValue={user?.role} disabled />
            </div>
          </div>
        </div>

        <div className="nexus-card p-5 divide-y divide-border">
          <p className="pb-3 text-sm font-semibold text-coffee">AI preferences</p>
          <Toggle label="Enable semantic search" description="Use embeddings instead of exact keyword matching." defaultChecked />
          <Toggle label="Display source citations" description="Show the documents and pages behind every answer." defaultChecked />
          <Toggle label="Enable response streaming" description="Stream assistant responses as they are generated." />
          <Toggle label="Automatically index uploaded documents" description="Process new uploads immediately." defaultChecked />
        </div>

        <div className="nexus-card p-5 divide-y divide-border">
          <p className="pb-3 text-sm font-semibold text-coffee">Notifications</p>
          <Toggle label="Processing complete" description="Notify me when a document finishes processing." defaultChecked />
          <Toggle label="Processing failed" description="Notify me if a document fails to process." defaultChecked />
        </div>

        <p className="text-xs text-grey">
          Note: these preference toggles are UI-only in this MVP — they are not yet wired to backend behavior.
        </p>
      </div>
    </AppShell>
  );
}
