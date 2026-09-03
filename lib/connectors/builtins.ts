import { and, eq } from "drizzle-orm";
import { encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { connections } from "@/lib/db/schema";

const builtins = [
  { kind: "local" as const, name: "Dieses Gerät" },
  { kind: "share" as const, name: "Link für iPhone & Co." },
];

export async function ensureBuiltinConnections(userId: string) {
  const db = getDb();
  for (const item of builtins) {
    const [existing] = await db
      .select({ id: connections.id })
      .from(connections)
      .where(and(eq(connections.userId, userId), eq(connections.kind, item.kind)))
      .limit(1);
    if (existing) continue;
    await db.insert(connections).values({
      userId,
      kind: item.kind,
      name: item.name,
      encryptedConfig: encryptSecret(JSON.stringify({ userId })),
    });
  }
}
