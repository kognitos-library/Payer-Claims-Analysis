"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Title,
  Text,
  Skeleton,
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
import { RunStatusBadge } from "@/components/run-status-badge";
import { DashboardError } from "@/components/error-states";
import { NoReviewItems } from "@/components/empty-states";
import type { NormalizedRun } from "@/lib/transforms";
import dayjs from "dayjs";

export default function ReviewPage() {
  const [reviewItems, setReviewItems] = useState<NormalizedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/runs?pageSize=50");
        if (!res.ok) throw new Error("Failed to load review data");
        const data = await res.json();
        const needsReview = (data.runs as NormalizedRun[]).filter(
          (r) =>
            r.state === "awaiting_guidance" ||
            r.state === "failed" ||
            r.state === "executing"
        );
        setReviewItems(needsReview);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error) return <DashboardError message={error} />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <Title level="h2">Review Queue</Title>
        <Text color="muted">Claim batches needing attention</Text>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      ) : reviewItems.length === 0 ? (
        <NoReviewItems />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{reviewItems.length} batch{reviewItems.length !== 1 ? "es" : ""} need attention</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewItems.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-sm">{run.id.slice(0, 12)}...</TableCell>
                    <TableCell><RunStatusBadge state={run.state} /></TableCell>
                    <TableCell>{dayjs(run.createdAt).format("MMM D, h:mm A")}</TableCell>
                    <TableCell>{run.emailRecipient || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/runs/${run.id}`}>
                            <Icon type="Eye" size="sm" className="mr-1" />
                            View Details
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={run.kognitosUrl} target="_blank" rel="noopener noreferrer">
                            <Icon type="ExternalLink" size="sm" className="mr-1" />
                            View in Kognitos
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
      )}
    </div>
  );
}
