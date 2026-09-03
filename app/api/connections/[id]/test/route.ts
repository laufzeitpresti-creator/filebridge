import { NextResponse } from "next/server";
import { connectorMeta } from "@/lib/connectors/catalog";
import { connectorFromRow, getOwnedConnection } from "@/lib/connectors/resolve";
import { jsonError, limitUser, requireUserId, tooManyRequests } from "@/lib/http";
import { uuidParam } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  if (!limitUser(auth.userId, "connection-test", 20, 60_000)) return tooManyRequests();
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Ungültige ID.");
  try {
    const row = await getOwnedConnection(auth.userId, id);
    const connector = connectorFromRow(row);
    const root = connectorMeta(row.kind)?.rootPath ?? "/";
    await connector.list(root);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Verbindungstest fehlgeschlagen.", 400);
  }
}
