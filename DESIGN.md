# Design System — Payer Claims Analysis

## Framework

- **Design System**: `@kognitos/lattice` v1.18.0 (installed from local tarball)
- **Styling**: Tailwind CSS v4 with Lattice CSS custom properties
- **Charts**: Recharts v3 wrapped in Lattice `ChartContainer`
- **Icons**: Lucide via Lattice `Icon` component

## Tokens

All colors via semantic Tailwind classes. No hardcoded hex values.

| Token | Usage |
|-------|-------|
| `bg-primary` | Primary action buttons, active sidebar |
| `text-muted-foreground` | Secondary text, labels |
| `bg-success` / `text-success` | Completed status, successful submissions |
| `bg-warning` / `text-warning` | Executing / in-progress states |
| `bg-destructive` / `text-destructive` | Failed states, errors |
| `var(--chart-1)` .. `var(--chart-10)` | Chart data series colors |
| `bg-card` | Card backgrounds |
| `border-border` | Borders, dividers |

## Component Mapping

| Need | Lattice Component |
|------|-------------------|
| Metric cards | `InsightsCard` / `InsightsCardTrend` |
| Status badges | `Badge` (`success`, `warning`, `destructive`, `secondary`) |
| Page shell | `<div className="p-6 space-y-6">` inside `SidebarInset` |
| Sidebar nav | `Sidebar` + `SidebarMenu` + `SidebarMenuItem` + `SidebarMenuButton` |
| Data tables | `DataTable` (AG Grid) for claims, `Table` for simple views |
| Charts | `ChartContainer` + `ChartTooltip` + `ChartTooltipContent` |
| Loading | `Skeleton`, `Spinner` |
| Empty states | `Empty` + `EmptyTitle` + `EmptyDescription` |
| Errors | `Alert` + `AlertTitle` + `AlertDescription` |
| Typography | `Title` (h1-h4), `Text` (xSmall/small/base/large) |
| Icons | `Icon` component with Lucide names |

## Layout Rules

- Sidebar is always open (`SidebarProvider open={true}`)
- No `PageLayout`/`PageHeader` — plain divs inside `SidebarInset`
- Page titles rendered inside each page, not in a shared header
- Responsive grids: `grid-cols-2 md:grid-cols-3 xl:grid-cols-5` to account for sidebar width
- High column counts (4+) delayed to `xl:` or `2xl:` breakpoints

## Domain Language

| Kognitos Term | App Term |
|---------------|----------|
| Run | Claim Batch |
| completed | Submitted |
| executing | Processing |
| awaiting_guidance | Needs Review |
| failed | Failed |
| stopped | Stopped |
| pending | Queued |
| pending_patients | Patients |
| claims_submitted | Claims Detail |
| email_status | Submission Status |
| completed_pdfs | CMS-1450 Forms |
