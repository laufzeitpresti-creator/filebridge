import { NextResponse } from "next/server";
import { connectorFromRow, getOwnedConnection } from "@/lib/connectors/resolve";
import { jsonError, limitUser, requireUserId, tooManyRequests } from "@/lib/http";
import { uuidParam } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  if (!limitUser(auth.userId, "browse", 60, 60_000)) return tooManyRequests();
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Ungültige ID.");
  const path = new URL(request.url).searchParams.get("path") || "";
  try {
    const row = await getOwnedConnection(auth.userId, id);
    const connector = connectorFromRow(row);
    const entries = await connector.list(path);
    return NextResponse.json({ entries });
  } catch {
    return jsonError("Ordner konnte nicht gelesen werden.", 400);
  }
}
