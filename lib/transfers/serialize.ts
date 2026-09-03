import type { TransferRow } from "@/lib/db/schema";

export function publicTransfer(
  row: TransferRow,
  extras?: { destKind?: string; downloadUrl?: string | null },
) {
  return {
    id: row.id,
    status: row.status,
    fileName: row.fileName,
    bytesCopied: row.bytesCopied,
    bytesTotal: row.bytesTotal,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    error: row.error ? "Transfer fehlgeschlagen." : null,
    destKind: extras?.destKind,
    downloadUrl: extras?.downloadUrl ?? null,
  };
}
