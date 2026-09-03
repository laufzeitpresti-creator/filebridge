import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL?.trim() || "file:./data/filebridge.db";
const isPostgres = url.startsWith("postgres://") || url.startsWith("postgresql://");

export default defineConfig(
  isPostgres
    ? {
        schema: "./lib/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        dbCredentials: { url },
      }
    : {
        schema: "./lib/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        driver: "pglite",
        dbCredentials: { url: url.replace(/^file:/, "") },
      },
);
