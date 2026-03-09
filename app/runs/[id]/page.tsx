"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  Badge,
  Button,
  Icon,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Separator,
} from "@kognitos/lattice";
import { RunStatusBadge } from "@/components/run-status-badge";
import { DashboardError } from "@/components/error-states";
import type { NormalizedRun } from "@/lib/transforms";
import dayjs from "dayjs";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<NormalizedRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/runs/${id}`);
        if (!res.ok) throw new Error("Failed to load batch details");
        const data = await res.json();
        setRun(data.run);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (error) return <DashboardError message={error} />;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[200px] rounded-lg" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  if (!run) return <DashboardError message="Batch not found" />;

  const sections = new Map<string, typeof run.claimFields>();
  for (const field of run.claimFields) {
    const existing = sections.get(field.section) ?? [];
    existing.push(field);
    sections.set(field.section, existing);
  }

  const patientCols = run.claimFields.length > 0
    ? Object.keys(run.claimFields[0].values)
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/"><Icon type="ArrowLeft" size="sm" /></Link>
          </Button>
          <div>
            <Title level="h2">Claim Batch</Title>
            <Text color="muted" level="small" className="font-mono">{run.id}</Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RunStatusBadge state={run.state} />
          <Button variant="outline" size="sm" asChild>
            <a href={run.kognitosUrl} target="_blank" rel="noopener noreferrer">
              <Icon type="ExternalLink" size="sm" className="mr-1" />
              View in Kognitos
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <Text level="xSmall" color="muted">Created</Text>
            <Text level="base" weight="semibold">{dayjs(run.createdAt).format("MMM D, YYYY h:mm A")}</Text>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Text level="xSmall" color="muted">Patients</Text>
            <Text level="base" weight="semibold">{run.patients.length}</Text>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Text level="xSmall" color="muted">Total Charges</Text>
            <Text level="base" weight="semibold">
              ${run.patients.reduce((s, p) => s + p.totalCharges, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </Text>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Text level="xSmall" color="muted">CMS-1450 Forms</Text>
            <Text level="base" weight="semibold">{run.pdfCount}</Text>
          </CardContent>
        </Card>
      </div>

      {run.patients.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Patients</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Control #</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Total Charges</TableHead>
                  <TableHead>Admission Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.patients.map((p) => (
                  <TableRow key={p.patientControlNumber}>
                    <TableCell className="font-medium">{p.patientName}</TableCell>
                    <TableCell className="font-mono">{p.patientControlNumber}</TableCell>
                    <TableCell>{p.payer}</TableCell>
                    <TableCell>${p.totalCharges.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{p.admissionDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {run.emailStatuses.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Submission Status</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>PDF Found</TableHead>
                  <TableHead>Email Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.emailStatuses.map((e) => (
                  <TableRow key={e.patientControlNumber}>
                    <TableCell className="font-medium">{e.patientName}</TableCell>
                    <TableCell className="text-sm">{e.recipientEmail}</TableCell>
                    <TableCell>
                      <Badge variant={e.pdfFound ? "success" : "destructive"}>
                        {e.pdfFound ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.emailSent ? "success" : "destructive"}>
                        {e.emailSent ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {sections.size > 0 && (
        <Card>
          <CardHeader><CardTitle>CMS-1450 Claims Detail</CardTitle></CardHeader>
          <CardContent>
            <Accordion type="multiple">
              {Array.from(sections.entries()).map(([section, fields]) => (
                <AccordionItem key={section} value={section}>
                  <AccordionTrigger>{section}</AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/3">Field</TableHead>
                          {patientCols.map((col) => (
                            <TableHead key={col}>{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((f) => (
                          <TableRow key={f.field}>
                            <TableCell className="font-medium text-sm">{f.field}</TableCell>
                            {patientCols.map((col) => (
                              <TableCell key={col} className="text-sm">{f.values[col] || "—"}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
