import { useAmountFormatting, useDateFormatting, useNumberFormatting } from "@wealthfolio/ui";
import { shortParts } from "../lib/format";
import { hasGaps, type MonthRow } from "../lib/monthly";

const HIDDEN = "••••";

/** Number formatting that follows the user's region and privacy mode. */
export function useFormatters(currency: string, isHidden: boolean) {
  const { formatAmount, formatCurrencySymbol } = useAmountFormatting();
  const { formatPercent, formatDecimal } = useNumberFormatting();
  // Short amounts for table cells: "850 €", "1,0k €", "12,3k €", "123k €",
  // "1,23M €", with the decimals Wealthfolio's formatCompactAmount uses, always
  // shown so a column reads evenly. That function itself writes the locale's
  // words ("12,3 mil €" in Spanish), so "k" and "M" are added here; the number,
  // separators and symbol position follow the user's region.
  const symbol = formatCurrencySymbol(currency);
  const symbolFirst = /^[^\d\s-]/.test(formatAmount(1, currency).trim());
  const short = (v: number) => {
    if (isHidden) return HIDDEN;
    const [n, unit, digits] = shortParts(v);
    const num = formatDecimal(n, { minimumFractionDigits: digits, maximumFractionDigits: digits }) + unit;
    return symbolFirst ? `${num.startsWith("-") ? "-" : ""}${symbol}${num.replace(/^-/, "")}` : `${num} ${symbol}`;
  };
  return {
    symbol,
    short,
    signedShort: (v: number) => (!isHidden && v >= 0.5 ? `+${short(v)}` : short(v)),
    amount: (v: number) => (isHidden ? HIDDEN : formatAmount(v, currency)),
    percent: (v: number) => formatPercent(v, { digits: 1, signDisplay: "exceptZero" }),
  };
}

const MONTH_NAME = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

/** What happened in one month, shown when hovering a cell. */
export function MonthDetails({ row, currency, isHidden }: { row: MonthRow; currency: string; isHidden: boolean }) {
  const f = useFormatters(currency, isHidden);
  const { formatCalendarDate } = useDateFormatting();
  const title = MONTH_NAME.format(new Date(row.year, row.monthIndex, 1));
  const lines: [string, string][] = [
    ["Start", row.open == null ? "–" : f.amount(row.open)],
    ["End", row.close == null ? "–" : f.amount(row.close)],
    ["Net deposits", f.amount(row.netFlow)],
  ];
  if (Math.abs(row.untracked) > 0.005) lines.push(["Added without a deposit", f.amount(row.untracked)]);
  lines.push(["Gain or loss", row.gain == null ? "–" : f.amount(row.gain)]);
  lines.push(["Time-weighted return", row.twr == null ? "–" : f.percent(row.twr)]);

  return (
    <div className="min-w-48 space-y-1 text-xs">
      <div className="font-medium">
        {title}
        {row.partial && <span className="text-muted-foreground font-normal"> · so far</span>}
      </div>
      {lines.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular-nums">{value}</span>
        </div>
      ))}
      {hasGaps(row) && <div className="text-muted-foreground pt-1">{gapNote(row)}</div>}
      {row.lastDate && (
        <div className="text-muted-foreground pt-1">
          End value from {formatCalendarDate(row.lastDate, { dateStyle: "medium" })}
        </div>
      )}
    </div>
  );
}

/** Why a month's return or gain is missing, in plain words. */
function gapNote(row: MonthRow): string {
  const parts: string[] = [];
  if (row.excludedDays > 0) {
    const days = row.excludedDays === 1 ? "1 day" : `${row.excludedDays} days`;
    parts.push(`${days} left out of the return: Wealthfolio couldn't value the holdings or doesn't know a deposit's size.`);
  }
  if (row.flowUnknown) parts.push("A deposit or withdrawal of unknown size, so the gain can't be worked out.");
  return parts.join(" ");
}
