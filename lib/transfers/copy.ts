export const CHUNK_SIZE = 8 * 1024 * 1024;

export async function copyInChunks(
  source: ReadableStream<Uint8Array>,
  onChunk: (chunk: Uint8Array, bytesCopied: number) => Promise<void>,
  startBytes = 0,
): Promise<number> {
  const reader = source.getReader();
  let bytesCopied = startBytes;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      bytesCopied += value.byteLength;
      await onChunk(value, bytesCopied);
    }
  } finally {
    reader.releaseLock();
  }
  return bytesCopied;
}

export function joinDestPath(folderPath: string, fileName: string): string {
  const trimmed = folderPath.replace(/\/+$/, "");
  if (!trimmed || trimmed === "/" || trimmed === "root") {
    return fileName.startsWith("/") ? fileName : `/${fileName}`;
  }
  return `${trimmed}/${fileName}`;
}
