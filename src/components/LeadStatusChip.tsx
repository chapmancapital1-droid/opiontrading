"use client";

import { useEffect, useState } from "react";
import { clearStoredLead, readStoredLead, type StoredLead } from "@/lib/leadCapture";

/** Small footer chip: who is unlocked + optional reset for testing */
export function LeadStatusChip() {
  const [lead, setLead] = useState<StoredLead | null>(null);

  useEffect(() => {
    setLead(readStoredLead());
  }, []);

  if (!lead) return null;

  return (
    <div className="text-[10px] text-[var(--text-muted)] px-1 mt-2 leading-snug">
      <div className="truncate" title={lead.email}>
        Free user: {lead.name.split(" ")[0]}
      </div>
      <button
        type="button"
        className="underline opacity-70 hover:opacity-100 border-0 bg-transparent p-0 text-[10px] text-[var(--text-muted)] cursor-pointer"
        onClick={() => {
          if (confirm("Sign out free unlock on this device? You will re-enter email.")) {
            clearStoredLead();
            window.location.reload();
          }
        }}
      >
        Switch account
      </button>
    </div>
  );
}
