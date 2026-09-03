import { desc, eq } from "drizzle-orm";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { connectorFromRow, getOwnedConnection } from "@/lib/connectors/resolve";
import { getDb } from "@/lib/db";
import { connections, transfers } from "@/lib/db/schema";
import { jsonError, limitUser, readJson, requireUserId, tooManyRequests } from "@/lib/http";
import { createShareToken } from "@/lib/share/token";
import { joinDestPath } from "@/lib/transfers/copy";
import { runTransfer } from "@/lib/transfers/run-transfer";
import { publicTransfer } from "@/lib/transfers/serialize";
import { transferCreateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  const rows = await getDb()
    .select({
      transfer: transfers,
      destKind: connections.kind,
    })
    .from(transfers)
    .innerJoin(connections, eq(transfers.destConnectionId, connections.id))
    .where(eq(transfers.userId, auth.userId))
    .orderBy(desc(transfers.createdAt));
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  return NextResponse.json({
    transfers: rows.map(({ transfer, destKind }) =>
      publicTransfer(transfer, {
        destKind,
        downloadUrl:
          destKind === "share" && transfer.status === "done" && appUrl
            ? `${appUrl}/d/${encodeURIComponent(createShareToken(auth.userId, transfer.destPath, transfer.fileName))}`
            : null,
      }),
    ),
  });
}

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  if (!limitUser(auth.userId, "transfer", 30, 60_000)) return tooManyRequests();
  const json = await readJson(request);
  if (json.error) return json.error;
  const parsed = transferCreateSchema.safeParse(json.body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
  }
  try {
    const sourceRow = await getOwnedConnection(auth.userId, parsed.data.sourceConnectionId);
    const destRow = await getOwnedConnection(auth.userId, parsed.data.destConnectionId);
    const source = connectorFromRow(sourceRow);
    const stat = await source.stat(parsed.data.sourcePath);
    if (stat.isDir) {
      return jsonError("Bitte eine Datei wählen, kein Ordner.");
    }
    const destPath = joinDestPath(parsed.data.destFolder || "/", parsed.data.fileName);
    const [job] = await getDb()
      .insert(transfers)
      .values({
        userId: auth.userId,
        sourceConnectionId: sourceRow.id,
        destConnectionId: destRow.id,
        sourcePath: parsed.data.sourcePath,
        destPath,
        fileName: parsed.data.fileName,
        status: "queued",
        bytesTotal: stat.size ?? null,
      })
      .returning();

    after(async () => {
      try {
        await runTransfer(auth.userId, job.id);
      } catch {
        // Status is persisted in runTransfer.
      }
    });

    return NextResponse.json({ transfer: publicTransfer(job) });
  } catch {
    return jsonError("Transfer konnte nicht gestartet werden.");
  }
}
