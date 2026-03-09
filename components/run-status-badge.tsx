"use client";

import { Badge } from "@kognitos/lattice";
import { stateLabel, stateBadgeVariant } from "@/lib/transforms";
import type { RunState } from "@/lib/types";

export function RunStatusBadge({ state }: { state: RunState }) {
  return <Badge variant={stateBadgeVariant(state)}>{stateLabel(state)}</Badge>;
}
