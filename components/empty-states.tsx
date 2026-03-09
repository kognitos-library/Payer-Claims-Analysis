"use client";

import { Empty, EmptyTitle, EmptyDescription, EmptyContent, Icon, Button } from "@kognitos/lattice";
import Link from "next/link";

export function NoRunsEmpty() {
  return (
    <Empty>
      <Icon type="FileText" size="xl" className="text-muted-foreground mb-2" />
      <EmptyTitle>No claim batches yet</EmptyTitle>
      <EmptyDescription>
        Claim batches will appear here once the Provider Claims Processor runs.
      </EmptyDescription>
    </Empty>
  );
}

export function NoDataEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Empty>
      <Icon type="Database" size="xl" className="text-muted-foreground mb-2" />
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </Empty>
  );
}

export function NoReviewItems() {
  return (
    <Empty>
      <Icon type="CircleCheck" size="xl" className="text-success mb-2" />
      <EmptyTitle>All clear</EmptyTitle>
      <EmptyDescription>
        No claim batches need review right now.
      </EmptyDescription>
      <EmptyContent>
        <Button variant="outline" asChild>
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
