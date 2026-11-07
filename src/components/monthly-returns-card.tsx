import { AnimatedToggleGroup, Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@wealthfolio/ui";
import { hasGaps, yearGain, yearReturn, type MonthRow } from "../lib/monthly";
import { MonthDetails, useFormatters } from "./month-details";
import { MonthGrid } from "./month-grid";

export const RETURN_MODES = ["percent", "amount"] as const;
export type ReturnMode = (typeof RETURN_MODES)[number];

interface Props {
  years: { year: number; months: (MonthRow | null)[] }[];
  currency: string;
  isHidden: boolean;
  mode: ReturnMode;
  onModeChange: (mode: ReturnMode) => void;
}

/** Monthly returns: time-weighted %, or the gain or loss in money. */
export function MonthlyReturnsCard({ years, currency, isHidden, mode, onModeChange }: Props) {
  const f = useFormatters(currency, isHidden);
  const inPercent = mode === "percent";
  const anyGaps = years.some((y) => y.months.some((m) => m != null && hasGaps(m)));
  const modeItems = [
    { value: "percent" as const, label: "Return %" },
    { value: "amount" as const, label: `Return ${f.symbol}` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Returns</CardTitle>
        <CardDescription>
          {inPercent
            ? "Time-weighted return for each month, so deposits and withdrawals don't affect it. Best and worst months are highlighted."
            : "Gain or loss for each month in money: price changes, dividends, interest, fees and currency moves, without deposits and withdrawals. Best and worst months are highlighted."}
        </CardDescription>
        <CardAction>
          <AnimatedToggleGroup
            items={modeItems}
            value={mode}
            onValueChange={onModeChange}
            variant="secondary"
            size="sm"
            rounded="full"
            aria-label="Show returns as"
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <MonthGrid
          years={years}
          highlightExtremes
          format={inPercent ? f.percent : f.signedShort}
          cell={(r) => {
            const v = inPercent ? r.twr : r.gain;
            return { value: v, tone: v };
          }}
          total={(rows) => {
            const v = inPercent ? yearReturn(rows) : yearGain(rows);
            return { value: v, tone: v };
          }}
          totalLabel="Full year"
          totalHint={inPercent ? "The year's monthly returns chained together" : "Sum of the year's monthly gains and losses"}
          details={(r) => <MonthDetails row={r} currency={currency} isHidden={isHidden} />}
        />
        {anyGaps && (
          <p className="text-muted-foreground mt-1 text-xs">
            A – means Wealthfolio's data can't support that number, for example holdings it couldn't value or a
            deposit of unknown size. Hover the month to see why; a year with such a month has no full-year return.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
