import { AnimatedToggleGroup, Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@wealthfolio/ui";
import { change, yearEnd, type MonthRow } from "../lib/monthly";
import { MonthDetails, useFormatters } from "./month-details";
import { MonthGrid, type GridCell } from "./month-grid";

export const VALUE_MODES = ["value", "change-percent", "change-amount"] as const;
export type ValueMode = (typeof VALUE_MODES)[number];

interface Props {
  years: { year: number; months: (MonthRow | null)[] }[];
  currency: string;
  isHidden: boolean;
  mode: ValueMode;
  onModeChange: (mode: ValueMode) => void;
  /** Whole portfolio ("All accounts") or a single account. */
  scope: "portfolio" | "account";
}

/**
 * Value at each month end, or how much it changed, deposits included.
 * Investment accounts only: not net worth, which in Wealthfolio also counts
 * alternative assets and liabilities.
 */
export function ValueCard({ years, currency, isHidden, mode, onModeChange, scope }: Props) {
  const subject = scope === "portfolio" ? "portfolio" : "account";
  const f = useFormatters(currency, isHidden);
  const modeItems = [
    { value: "value" as const, label: "Value" },
    { value: "change-percent" as const, label: "Change %" },
    { value: "change-amount" as const, label: `Change ${f.symbol}` },
  ];

  const config: Record<
    ValueMode,
    {
      description: string;
      totalLabel: string;
      totalHint: string;
      format: (v: number) => string;
      cell: (r: MonthRow) => GridCell;
      total: (rows: MonthRow[]) => GridCell;
    }
  > = {
    value: {
      description: `What the ${subject} was worth at the end of each month: green when higher than the month before, red when lower.`,
      totalLabel: "Year end",
      totalHint: "Value at the end of the year, or the latest value for the current year",
      format: f.short,
      cell: (r) => ({ value: r.close, tone: r.close == null || r.open == null ? null : r.close - r.open }),
      total: (rows) => {
        const last = yearEnd(rows);
        // Compare with the previous year end, or, in the very first year, with
        // the first value there is.
        const first = rows[0]?.open ?? rows.find((r) => r.close != null)?.close ?? null;
        return { value: last, tone: last != null && first != null ? last - first : null };
      },
    },
    "change-percent": {
      description: "Change in value from the previous month end, deposits and withdrawals included.",
      totalLabel: "Full year",
      totalHint: "Year end compared with the end of the previous year",
      format: f.percent,
      cell: (r) => {
        const v = change(r.close, r.open);
        return { value: v, tone: v };
      },
      total: (rows) => {
        const v = rows.length ? change(yearEnd(rows), rows[0].open) : null;
        return { value: v, tone: v };
      },
    },
    "change-amount": {
      description: "Change in value from the previous month end, deposits and withdrawals included.",
      totalLabel: "Full year",
      totalHint: "How much the value grew or shrank during the year, deposits and withdrawals included",
      format: f.signedShort,
      cell: (r) => {
        // The first month has nothing to change from.
        const v = r.close == null || r.open == null ? null : r.close - r.open;
        return { value: v, tone: v };
      },
      total: (rows) => {
        const end = yearEnd(rows);
        const start = rows[0]?.open ?? null;
        const v = end == null || start == null ? null : end - start;
        return { value: v, tone: v };
      },
    },
  };
  const c = config[mode];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{scope === "portfolio" ? "Portfolio value" : "Account value"} by month</CardTitle>
        <CardDescription>{c.description}</CardDescription>
        <CardAction>
          <AnimatedToggleGroup
            items={modeItems}
            value={mode}
            onValueChange={onModeChange}
            variant="secondary"
            size="sm"
            rounded="full"
            aria-label="Show value as"
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <MonthGrid
          years={years}
          format={c.format}
          cell={c.cell}
          total={c.total}
          totalLabel={c.totalLabel}
          totalHint={c.totalHint}
          details={(r) => <MonthDetails row={r} currency={currency} isHidden={isHidden} />}
        />
      </CardContent>
    </Card>
  );
}
