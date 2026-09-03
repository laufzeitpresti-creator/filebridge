import { z } from "zod";

export const uuidParam = z.string().uuid();

const safePath = z
  .string()
  .min(1)
  .max(2048)
  .refine((value) => !value.includes("\0") && !value.includes(".."), "Ungültiger Pfad.");

const safeFileName = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[^/\\<>:"|?*\u0000]+$/, "Ungültiger Dateiname.");

export const transferCreateSchema = z.object({
  sourceConnectionId: uuidParam,
  destConnectionId: uuidParam,
  sourcePath: safePath,
  destFolder: z.string().max(2048).optional(),
  fileName: safeFileName,
});

export const connectionFormSchema = z
  .object({
    kind: z.enum(["sftp", "ftp", "webdav", "s3", "http"]),
    name: z.string().max(120).optional(),
    host: z.string().max(255).optional(),
    port: z.union([z.number(), z.string()]).optional(),
    username: z.string().max(255).optional(),
    password: z.string().max(4096).optional(),
    privateKey: z.string().max(16_384).optional(),
    secure: z.boolean().optional(),
    url: z.string().max(2048).optional(),
    endpoint: z.string().max(2048).optional(),
    region: z.string().max(64).optional(),
    bucket: z.string().max(255).optional(),
    accessKeyId: z.string().max(255).optional(),
    secretAccessKey: z.string().max(255).optional(),
    forcePathStyle: z.boolean().optional(),
  })
  .passthrough();
