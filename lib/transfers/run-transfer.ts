import { eq } from "drizzle-orm";
import { connectorFromRow, getOwnedConnection } from "@/lib/connectors/resolve";
import { getDb } from "@/lib/db";
import { transfers } from "@/lib/db/schema";

const STALE_MS = 2 * 60 * 1000;

export async function runTransfer(userId: string, transferId: string): Promise<void> {
  const db = getDb();
  const [job] = await db.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
  if (!job || job.userId !== userId) {
    throw new Error("Transfer not found");
  }
  if (job.status === "done") return;
  if (job.status === "running" && Date.now() - job.updatedAt.getTime() < STALE_MS) {
    return;
  }

  await db
    .update(transfers)
    .set({ status: "running", error: null, updatedAt: new Date() })
    .where(eq(transfers.id, transferId));

  try {
    const sourceRow = await getOwnedConnection(userId, job.sourceConnectionId);
    const destRow = await getOwnedConnection(userId, job.destConnectionId);
    const source = connectorFromRow(sourceRow);
    const dest = connectorFromRow(destRow);
    const stat = await source.stat(job.sourcePath);
    if (stat.isDir) {
      throw new Error("Source path is a folder");
    }
    const offset = job.bytesCopied > 0 ? job.bytesCopied : 0;
    const { stream, size } = await source.read(job.sourcePath, { offset });
    const total = size ?? stat.size ?? job.bytesTotal ?? null;

    if (total !== null) {
      await db
        .update(transfers)
        .set({ bytesTotal: total, updatedAt: new Date() })
        .where(eq(transfers.id, transferId));
    }

    let copied = offset;
    let lastFlush = Date.now();
    const tracked = stream.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        async transform(chunk, controller) {
          copied += chunk.byteLength;
          if (Date.now() - lastFlush > 1000) {
            lastFlush = Date.now();
            await db
              .update(transfers)
              .set({ bytesCopied: copied, status: "running", updatedAt: new Date() })
              .where(eq(transfers.id, transferId));
          }
          controller.enqueue(chunk);
        },
      }),
    );

    await dest.write(job.destPath, tracked, {
      size: total ?? undefined,
      offset,
    });

    const finalStat = await dest.stat(job.destPath).catch(() => null);
    await db
      .update(transfers)
      .set({
        status: "done",
        bytesCopied: finalStat?.size ?? total ?? job.bytesCopied,
        bytesTotal: total,
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(transfers.id, transferId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer failed";
    await db
      .update(transfers)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(transfers.id, transferId));
    throw error;
  }
}
