"use client";

import { Button } from "@warisly/ui";

export function PrintButton() {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      Cetak / Simpan PDF
    </Button>
  );
}
