"use client";

import { useState } from "react";

export function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const url = `${window.location.origin}/wali/${token}`;
    navigator.clipboard.writeText(url).then(() => setCopied(true));
  }
  return (
    <div className="mt-2">
      <p className="font-sans text-xs text-paper-muted">Bagikan tautan undangan ini ke wali:</p>
      <button onClick={copy} className="mt-1 font-sans text-xs text-nyala underline">
        {copied ? "Tersalin!" : "Salin tautan undangan"}
      </button>
    </div>
  );
}
