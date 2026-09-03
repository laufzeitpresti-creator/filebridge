import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { connections } from "@/lib/db/schema";
import { jsonError, requireUserId } from "@/lib/http";
import { uuidParam } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Ungültige ID.");
  const [row] = await getDb()
    .select({ kind: connections.kind })
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.userId, auth.userId)))
    .limit(1);
  if (!row) return jsonError("Verbindung nicht gefunden.", 404);
  if (row.kind === "local" || row.kind === "share") {
    return jsonError("Diese Verbindung gehört zum System und bleibt erhalten.", 400);
  }
  try {
    await getDb()
      .delete(connections)
      .where(and(eq(connections.id, id), eq(connections.userId, auth.userId)));
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Verbindung ist noch in einem Transfer und kann nicht gelöscht werden.", 409);
  }
}
