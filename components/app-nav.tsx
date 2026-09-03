"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import MorphicNavbar from "@/components/kokonutui/morphic-navbar";

const items = [
  { href: "/app", label: "Übersicht" },
  { href: "/app/connections", label: "Verbindungen" },
  { href: "/app/transfers", label: "Jobs" },
  { href: "/app/transfers/new", label: "Übertragen" },
];

export function AppNav({ children }: { children?: ReactNode }) {
  return (
    <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
      <Link className="shrink-0 text-sm font-semibold tracking-tight" href="/app">
        FileBridge
      </Link>
      <MorphicNavbar items={items} />
      <div className="shrink-0">{children}</div>
    </div>
  );
}
