"use client";

import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";

export function TransferChart({
  data,
}: {
  data: { name: string; mb: number }[];
}) {
  return (
    <BarChart aspectRatio="16 / 7" className="w-full" data={data} xDataKey="name">
      <Grid />
      <Bar dataKey="mb" />
      <BarXAxis />
      <BarYAxis />
    </BarChart>
  );
}
