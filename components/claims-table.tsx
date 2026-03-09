"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  Button,
  Icon,
  Text,
} from "@kognitos/lattice";
import type { NormalizedRun, Patient } from "@/lib/transforms";
import Link from "next/link";
import dayjs from "dayjs";

interface FlatClaim {
  runId: string;
  runDate: string;
  kognitosUrl: string;
  patient: Patient;
  emailSent: boolean;
}

export function ClaimsTable({ runs }: { runs: NormalizedRun[] }) {
  const [search, setSearch] = useState("");
  const [payerFilter, setPayerFilter] = useState("all");
  const [sortField, setSortField] = useState<"date" | "charges" | "name">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const claims = useMemo<FlatClaim[]>(() => {
    const flat: FlatClaim[] = [];
    for (const run of runs) {
      if (run.state !== "completed") continue;
      for (const patient of run.patients) {
        const emailStatus = run.emailStatuses.find(
          (e) => e.patientControlNumber === patient.patientControlNumber
        );
        flat.push({
          runId: run.id,
          runDate: run.createdAt,
          kognitosUrl: run.kognitosUrl,
          patient,
          emailSent: emailStatus?.emailSent ?? false,
        });
      }
    }
    return flat;
  }, [runs]);

  const payers = useMemo(
    () => [...new Set(claims.map((c) => c.patient.payer).filter(Boolean))].sort(),
    [claims]
  );

  const filtered = useMemo(() => {
    let result = claims;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.patient.patientName.toLowerCase().includes(q) ||
          c.patient.patientControlNumber.includes(q) ||
          c.patient.payer.toLowerCase().includes(q)
      );
    }
    if (payerFilter !== "all") {
      result = result.filter((c) => c.patient.payer === payerFilter);
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = new Date(a.runDate).getTime() - new Date(b.runDate).getTime();
      else if (sortField === "charges") cmp = a.patient.totalCharges - b.patient.totalCharges;
      else if (sortField === "name") cmp = a.patient.patientName.localeCompare(b.patient.patientName);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [claims, search, payerFilter, sortField, sortDir]);

  function toggleSort(field: "date" | "charges" | "name") {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  const SortIcon = ({ field }: { field: "date" | "charges" | "name" }) => {
    if (sortField !== field) return <Icon type="ChevronsUpDown" size="xs" className="opacity-30" />;
    return sortDir === "desc"
      ? <Icon type="ChevronDown" size="xs" />
      : <Icon type="ChevronUp" size="xs" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by patient, control number, or payer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={payerFilter} onValueChange={setPayerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Payers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payers</SelectItem>
            {payers.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Text level="xSmall" color="muted">{filtered.length} claims</Text>

      <div className="rounded-lg border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                <span className="flex items-center gap-1">Patient <SortIcon field="name" /></span>
              </TableHead>
              <TableHead>Control #</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("charges")}>
                <span className="flex items-center gap-1">Charges <SortIcon field="charges" /></span>
              </TableHead>
              <TableHead>Email Sent</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("date")}>
                <span className="flex items-center gap-1">Batch Date <SortIcon field="date" /></span>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c, i) => (
              <TableRow key={`${c.runId}-${c.patient.patientControlNumber}-${i}`}>
                <TableCell className="font-medium">{c.patient.patientName}</TableCell>
                <TableCell className="font-mono text-sm">{c.patient.patientControlNumber}</TableCell>
                <TableCell>{c.patient.payer}</TableCell>
                <TableCell>${c.patient.totalCharges.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <Badge variant={c.emailSent ? "success" : "warning"}>
                    {c.emailSent ? "Sent" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>{dayjs(c.runDate).format("MMM D, h:mm A")}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-xs" asChild>
                    <Link href={`/runs/${c.runId}`}>
                      <Icon type="Eye" size="sm" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
