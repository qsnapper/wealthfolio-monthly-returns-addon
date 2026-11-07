import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@wealthfolio/ui";
import type { ReactNode } from "react";
import type { MonthRow } from "../lib/monthly";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface GridCell {
  value: number | null;
  /** Sign that picks the colour: > 0 gain, < 0 loss, otherwise neutral. */
  tone: number | null;
}

interface MonthGridProps {
  years: { year: number; months: (MonthRow | null)[] }[];
  cell: (row: MonthRow) => GridCell;
  total: (rows: MonthRow[]) => GridCell;
  format: (value: number) => string;
  details: (row: MonthRow) => ReactNode;
  totalLabel: string;
  totalHint: string;
  /** Mark the best and the worst month of the whole table. */
  highlightExtremes?: boolean;
}

/** One row per year, January to December, plus a total for the year. */
export function MonthGrid({
  years,
  cell,
  total,
  format,
  details,
  totalLabel,
  totalHint,
  highlightExtremes = false,
}: MonthGridProps) {
  const values = years.flatMap((y) =>
    y.months.flatMap((m) => (m ? [cell(m).value] : [])).filter((v): v is number => v != null),
  );
  const showExtremes = highlightExtremes && values.length > 2;
  const best = showExtremes ? Math.max(...values) : null;
  const worst = showExtremes ? Math.min(...values) : null;

  const hasPartial = years.some((y) => y.months.some((m) => m?.partial));

  return (
    <>
      <Table containerClassName="rounded-md">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-card sticky left-0 z-10 h-10 w-16">Year</TableHead>
            {MONTHS.map((m) => (
              <TableHead key={m} className="h-10 px-2.5 text-end">
                {m}
              </TableHead>
            ))}
            <TableHead className="h-10 border-l px-3 text-end" title={totalHint}>
              {totalLabel}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {years.map(({ year, months }) => {
            const yearTotal = total(months.filter((m): m is MonthRow => m != null));
            return (
              <TableRow key={year}>
                <TableCell className="bg-card text-muted-foreground sticky left-0 z-10 py-1.5 font-medium">
                  {year}
                </TableCell>
                {months.map((row, i) => {
                  if (!row) return <TableCell key={i} className="px-2 py-1" />;
                  const c = cell(row);
                  const extreme =
                    c.value == null ? null : c.value === best ? "best" : c.value === worst ? "worst" : null;
                  return (
                    <TableCell key={i} className="px-1 py-1 text-end">
                      <Tooltip>
                        <TooltipTrigger
                          className={cn(
                            "w-full cursor-default rounded-md px-1.5 py-0.5 text-end text-xs tabular-nums sm:text-sm",
                            toneClass(c.tone),
                            extreme === "best" && "bg-gain-subtle text-gain-subtle-foreground font-medium",
                            extreme === "worst" && "bg-loss-subtle text-loss-subtle-foreground font-medium",
                            row.partial && "italic",
                          )}
                        >
                          {c.value == null ? "–" : format(c.value)}
                        </TooltipTrigger>
                        <TooltipContent>{details(row)}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  );
                })}
                <TableCell
                  className={cn(
                    "border-l px-3 py-1.5 text-end text-xs font-semibold tabular-nums sm:text-sm",
                    toneClass(yearTotal.tone),
                  )}
                >
                  {yearTotal.value == null ? "–" : format(yearTotal.value)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {hasPartial && (
        <p className="text-muted-foreground mt-3 text-xs">
          <span className="italic">Italic</span>: this month so far.
        </p>
      )}
    </>
  );
}

function toneClass(tone: number | null) {
  if (tone == null || Math.abs(tone) < 1e-9) return "text-foreground";
  return tone > 0 ? "text-gain" : "text-loss";
}
