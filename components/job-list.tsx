"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import Loader from "@/components/kokonutui/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Job = {
  id: string;
  fileName: string;
  status: string;
  bytesCopied: number;
  bytesTotal: number | null;
  error: string | null;
  createdAt: string;
  downloadUrl?: string | null;
};

function statusLabel(status: string) {
  if (status === "queued") return "Wartend";
  if (status === "running") return "Läuft";
  if (status === "done") return "Fertig";
  if (status === "failed") return "Fehler";
  return status;
}

function formatBytes(value: number | null) {
  if (value == null) return "–";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function JobList() {
  const [jobs, setJobs] = useState<Job[] | null>(null);

  async function load() {
    const response = await fetch("/api/transfers");
    const json = (await response.json()) as { transfers?: Job[] };
    setJobs(json.transfers ?? []);
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 2500);
    return () => clearInterval(timer);
  }, []);

  async function retry(id: string) {
    const response = await fetch(`/api/transfers/${id}/run`, { method: "POST" });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(json.error || "Erneuter Versuch fehlgeschlagen");
      return;
    }
    toast.success("Transfer wird fortgesetzt");
    await load();
  }

  if (jobs === null) {
    return <Loader size="sm" subtitle="Status kommt in Kürze." title="Jobs laden" />;
  }

  if (jobs.length === 0) {
    return <p className="text-sm text-muted-foreground">Noch keine Transfers.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datei</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fortschritt</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const percent =
            job.bytesTotal && job.bytesTotal > 0
              ? Math.min(100, Math.round((job.bytesCopied / job.bytesTotal) * 100))
              : job.status === "done"
                ? 100
                : 0;
          return (
            <TableRow key={job.id}>
              <TableCell>
                <motion.div animate={{ opacity: 1 }} initial={{ opacity: 0.65 }} transition={{ duration: 0.2 }}>
                  <div className="font-medium">{job.fileName}</div>
                  {job.error ? (
                    <p className="mt-1 text-xs text-destructive">{job.error}</p>
                  ) : null}
                </motion.div>
              </TableCell>
              <TableCell>
                <Badge variant={job.status === "failed" ? "destructive" : "secondary"}>
                  {statusLabel(job.status)}
                </Badge>
              </TableCell>
              <TableCell className="min-w-40">
                <Progress value={percent} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBytes(job.bytesCopied)} / {formatBytes(job.bytesTotal)}
                </p>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {job.downloadUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={job.downloadUrl}>iPhone-Link</a>
                    </Button>
                  ) : null}
                  {(job.status === "failed" || job.status === "queued") && (
                    <Button onClick={() => retry(job.id)} size="sm" variant="outline">
                      Erneut versuchen
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
