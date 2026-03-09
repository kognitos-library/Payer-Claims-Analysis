"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Icon,
} from "@kognitos/lattice";
import { RunStatusBadge } from "./run-status-badge";
import dayjs from "dayjs";
import type { NormalizedRun } from "@/lib/transforms";

export function RecentBatches({ runs }: { runs: NormalizedRun[] }) {
  const recent = runs.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Claim Batches</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Patients</TableHead>
              <TableHead>Charges</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((run) => (
              <TableRow key={run.id}>
                <TableCell>{dayjs(run.createdAt).format("MMM D, h:mm A")}</TableCell>
                <TableCell><RunStatusBadge state={run.state} /></TableCell>
                <TableCell>{run.patients.length}</TableCell>
                <TableCell>
                  {run.patients.length > 0
                    ? `$${run.patients.reduce((s, p) => s + p.totalCharges, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-xs" asChild>
                      <Link href={`/runs/${run.id}`}>
                        <Icon type="Eye" size="sm" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon-xs" asChild>
                      <a href={run.kognitosUrl} target="_blank" rel="noopener noreferrer">
                        <Icon type="ExternalLink" size="sm" />
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
