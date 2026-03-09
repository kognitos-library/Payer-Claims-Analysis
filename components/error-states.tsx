"use client";

import { Alert, AlertTitle, AlertDescription, Icon } from "@kognitos/lattice";

export function DashboardError({ message }: { message: string }) {
  return (
    <div className="p-6">
      <Alert variant="destructive">
        <Icon type="CircleAlert" size="sm" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
