"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FadeIn } from "@/components/fade-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TransferChart = dynamic(
  () => import("@/components/transfer-chart").then((mod) => mod.TransferChart),
  {
    ssr: false,
    loading: () => <p className="py-10 text-sm text-muted-foreground">Diagramm lädt…</p>,
  },
);

type Job = {
  id: string;
  fileName: string;
  status: string;
  bytesCopied: number;
  bytesTotal: number | null;
};

type Connection = {
  id: string;
};

function shortName(name: string) {
  if (name.length <= 14) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  return `${name.slice(0, 10)}…${ext}`;
}

export function DashboardOverview({ name }: { name: string }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [connections, setConnections] = useState<Connection[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/transfers").then((response) => response.json()),
      fetch("/api/connections").then((response) => response.json()),
    ])
      .then(([transferJson, connectionJson]) => {
        if (cancelled) return;
        setJobs((transferJson as { transfers?: Job[] }).transfers ?? []);
        setConnections((connectionJson as { connections?: Connection[] }).connections ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setJobs([]);
        setConnections([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(() => {
    return (jobs ?? [])
      .slice(0, 8)
      .reverse()
      .map((job) => ({
        name: shortName(job.fileName),
        mb: Number((((job.bytesTotal ?? job.bytesCopied) || 0) / (1024 * 1024)).toFixed(2)),
      }));
  }, [jobs]);

  const done = jobs?.filter((job) => job.status === "done").length ?? 0;
  const running = jobs?.filter((job) => job.status === "running" || job.status === "queued").length ?? 0;

  return (
    <FadeIn className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hallo {name}</h1>
        <p className="mt-1 text-muted-foreground">
          Verbinde Cloud, Server oder dieses Gerät – dann eine Datei rüberschieben, auch als Link aufs iPhone.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Verbindungen" value={connections?.length} />
        <Metric label="Fertige Jobs" value={jobs ? done : null} />
        <Metric label="Laufen gerade" value={jobs ? running : null} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Letzte Transfers</CardTitle>
          <CardDescription>Größe in MB – echte Jobs, keine Demo-Zahlen.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs === null ? (
            <p className="py-10 text-sm text-muted-foreground">Jobs werden geladen…</p>
          ) : chartData.length === 0 ? (
            <div className="grid gap-3 py-6">
              <p className="text-sm text-muted-foreground">Noch keine Transfers. Erst verbinden, dann eine Datei wählen.</p>
              <Button asChild className="w-fit">
                <Link href="/app/transfers/new">Erste Datei übertragen</Link>
              </Button>
            </div>
          ) : (
            <TransferChart data={chartData} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Verbindungen</CardTitle>
            <CardDescription>Clouds, SFTP, WebDAV, S3, Gerät, iPhone-Link.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/connections">Verbindungen öffnen</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. Datei übertragen</CardTitle>
            <CardDescription>Quelle wählen, Zielordner wählen, starten.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/transfers/new">Datei übertragen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}

function Metric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value == null ? "–" : value}</p>
    </div>
  );
}
