"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon, FileIcon, FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileEntry } from "@/lib/connectors/types";

type Props = {
  connectionId: string | null;
  mode: "file" | "folder";
  onSelect: (entry: FileEntry) => void;
  selectedId?: string;
};

export function FileBrowser({ connectionId, mode, onSelect, selectedId }: Props) {
  const [path, setPath] = useState("");
  const [stack, setStack] = useState<{ path: string; name: string }[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPath("");
    setStack([]);
    setEntries([]);
  }, [connectionId]);

  useEffect(() => {
    if (!connectionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/connections/${connectionId}/browse?path=${encodeURIComponent(path)}`)
      .then(async (response) => {
        const json = (await response.json()) as { entries?: FileEntry[]; error?: string };
        if (!response.ok) throw new Error(json.error || "Ordner konnte nicht gelesen werden.");
        if (!cancelled) setEntries(json.entries ?? []);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Fehler");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connectionId, path]);

  if (!connectionId) {
    return <p className="text-sm text-muted-foreground">Zuerst eine Verbindung wählen.</p>;
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={stack.length === 0}
          onClick={() => {
            const next = stack.slice(0, -1);
            setStack(next);
            setPath(next.at(-1)?.path ?? "");
          }}
        >
          <ChevronLeftIcon />
          Zurück
        </Button>
        <p className="truncate text-xs text-muted-foreground">
          {stack.map((item) => item.name).join(" / ") || "Stammordner"}
        </p>
      </div>
      {loading ? (
        <p className="px-3 py-6 text-sm text-muted-foreground">Laden…</p>
      ) : error ? (
        <p className="px-3 py-6 text-sm text-destructive">{error}</p>
      ) : (
        <ul className="max-h-72 divide-y overflow-y-auto">
          {mode === "folder" && (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() =>
                  onSelect({
                    id: path || "root",
                    name: stack.at(-1)?.name || "Stammordner",
                    path: path || "root",
                    isDir: true,
                  })
                }
              >
                Diesen Ordner verwenden
              </button>
            </li>
          )}
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted ${
                  selectedId === entry.id ? "bg-muted" : ""
                }`}
                onClick={() => {
                  if (entry.isDir) {
                    setStack((prev) => [...prev, { path: entry.path, name: entry.name }]);
                    setPath(entry.path);
                    if (mode === "folder") onSelect(entry);
                    return;
                  }
                  if (mode === "file") onSelect(entry);
                }}
              >
                {entry.isDir ? <FolderIcon className="size-4" /> : <FileIcon className="size-4" />}
                <span className="truncate">{entry.name}</span>
              </button>
            </li>
          ))}
          {entries.length === 0 && (
            <li className="px-3 py-6 text-sm text-muted-foreground">Dieser Ordner ist leer.</li>
          )}
        </ul>
      )}
    </div>
  );
}
