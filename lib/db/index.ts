import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function isPostgresUrl(url: string) {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || "file:./data/filebridge.db";
}

type AppDb = ReturnType<typeof drizzlePostgres<typeof schema>>;

function createDb(): AppDb {
  const url = databaseUrl();
  if (isPostgresUrl(url)) {
    const client = postgres(url, {
      max: 1,
      prepare: false,
      ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
    });
    return drizzlePostgres(client, { schema });
  }
  const path = url.replace(/^file:/, "");
  const client = new PGlite(path);
  return drizzlePglite(client, { schema }) as unknown as AppDb;
}

let db: AppDb | null = null;

export function getDb() {
  if (!db) {
    db = createDb();
  }
  return db;
}
