import { index, pgTable, text, timestamp, bigint, uuid } from "drizzle-orm/pg-core";

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    encryptedConfig: text("encrypted_config").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("connections_user_idx").on(table.userId)],
);

export const transfers = pgTable(
  "transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    sourceConnectionId: uuid("source_connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "restrict" }),
    destConnectionId: uuid("dest_connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "restrict" }),
    sourcePath: text("source_path").notNull(),
    destPath: text("dest_path").notNull(),
    fileName: text("file_name").notNull(),
    status: text("status").notNull().default("queued"),
    bytesCopied: bigint("bytes_copied", { mode: "number" }).notNull().default(0),
    bytesTotal: bigint("bytes_total", { mode: "number" }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("transfers_user_idx").on(table.userId),
    index("transfers_status_idx").on(table.status),
  ],
);

export type ConnectionRow = typeof connections.$inferSelect;
export type TransferRow = typeof transfers.$inferSelect;
