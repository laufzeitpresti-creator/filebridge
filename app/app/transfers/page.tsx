import { JobList } from "@/components/job-list";
import { FadeIn } from "@/components/fade-in";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TransfersPage() {
  return (
    <FadeIn className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="mt-1 text-muted-foreground">
            Fortschritt aktualisiert sich selbst. Bei Abbruch: erneut versuchen.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/transfers/new">Datei übertragen</Link>
        </Button>
      </div>
      <JobList />
    </FadeIn>
  );
}
