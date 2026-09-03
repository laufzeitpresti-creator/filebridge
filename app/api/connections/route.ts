import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ensureBuiltinConnections } from "@/lib/connectors/builtins";
import { connectionFromForm, encryptConfig } from "@/lib/connectors/from-form";
import { getDb } from "@/lib/db";
import { connections } from "@/lib/db/schema";
import { jsonError, limitUser, readJson, requireUserId, tooManyRequests } from "@/lib/http";
import { connectionFormSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  await ensureBuiltinConnections(auth.userId);
  const rows = await getDb()
    .select({
      id: connections.id,
      kind: connections.kind,
      name: connections.name,
      createdAt: connections.createdAt,
    })
    .from(connections)
    .where(eq(connections.userId, auth.userId))
    .orderBy(desc(connections.createdAt));
  return NextResponse.json({ connections: rows });
}

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  if (!limitUser(auth.userId, "connection-create", 20, 60_000)) return tooManyRequests();
  const json = await readJson(request);
  if (json.error) return json.error;
  const checked = connectionFormSchema.safeParse(json.body);
  if (!checked.success) return jsonError("Ungültige Eingabe.");
  try {
    const parsed = await connectionFromForm(checked.data);
    const [row] = await getDb()
      .insert(connections)
      .values({
        userId: auth.userId,
        kind: parsed.kind,
        name: parsed.name,
        encryptedConfig: encryptConfig(parsed.config),
      })
      .returning({
        id: connections.id,
        kind: connections.kind,
        name: connections.name,
        createdAt: connections.createdAt,
      });
    return NextResponse.json({ connection: row });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
  }
}
