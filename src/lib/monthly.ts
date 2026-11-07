/**
 * monthly.ts  ·  Turns Wealthfolio's daily valuations into one row per month.
 * ===========================================================================
 *
 * Everything is in the base currency. For each month we keep:
 *  - open / close: value at the previous month end and at this month end,
 *  - netFlow: deposits minus withdrawals during the month,
 *  - untracked: value that appeared with no recorded deposit (for example a
 *    holdings-only account starting from nothing). It is kept out of the gain
 *    instead of being counted as one,
 *  - gain: gain or loss from investing (close - open - netFlow - untracked):
 *    price changes, dividends, interest, fees and currency moves,
 *  - twr: time-weighted return, chained day by day, so the timing of
 *    deposits doesn't move it.
 *
 * The daily return follows Wealthfolio's own (portfolio-engine measure.rs), so
 * the numbers can be compared with its performance page:
 *
 *     (value + outflow - previous - inflow) / (previous + inflow)
 *
 * Deposits count at the start of the day, withdrawals at the end. A day
 * Wealthfolio can't vouch for (holdings it couldn't price, a deposit of
 * unknown size, a negative value) is left out of the return, never guessed,
 * and the month says how many days were left out.
 */
import type { AccountValuation } from "@wealthfolio/addon-sdk";

/** Below this base a daily return means nothing (an empty or dust account). */
const MIN_RETURN_BASE = 1;

/** Flow sources Wealthfolio itself treats as unusable for returns. */
const UNKNOWN_FLOW_SOURCES: ReadonlySet<string> = new Set([
  "UNKNOWN",
  "UNKNOWN_BOUNDARY_TRANSFER",
  "UNPRICED_HOLDINGS_TRANSITION",
]);

export interface DayPoint {
  date: string; // YYYY-MM-DD
  /** null when Wealthfolio couldn't value the day. */
  value: number | null;
  inflow: number;
  outflow: number;
  /** false when Wealthfolio doesn't know how much moved in or out that day. */
  flowKnown: boolean;
}

export interface MonthRow {
  month: string; // YYYY-MM
  year: number;
  monthIndex: number; // 0..11
  /** Date of the last day with a value; null when the month has none. */
  lastDate: string | null;
  open: number | null; // null for the very first month
  close: number | null; // null when no day in the month could be valued
  netFlow: number;
  untracked: number;
  gain: number | null; // null when a deposit or withdrawal amount is unknown
  twr: number | null; // null when no day could be measured or a day was left out
  /** Days left out of the return because Wealthfolio couldn't vouch for them. */
  excludedDays: number;
  /** A deposit or withdrawal of unknown size happened this month. */
  flowUnknown: boolean;
  partial: boolean; // the current, unfinished month
}

export function toDayPoints(valuations: AccountValuation[]): DayPoint[] {
  return [...valuations]
    .sort((a, b) => a.valuationDate.localeCompare(b.valuationDate))
    .map((v) => {
      const value = v.totalValueBase;
      const valued = v.valueStatus !== "unavailable" && typeof value === "number" && Number.isFinite(value);
      return {
        date: v.valuationDate.slice(0, 10),
        value: valued ? value : null,
        inflow: finite(v.externalInflowBase),
        outflow: finite(v.externalOutflowBase),
        flowKnown: !UNKNOWN_FLOW_SOURCES.has(v.externalFlowSource),
      };
    });
}

export function monthlyRows(points: DayPoint[], today = new Date()): MonthRow[] {
  const thisMonth = isoMonth(today);
  const rows: MonthRow[] = [];
  let prevValue = 0; // last known value; 0 before the first one
  let prevClose: number | null = null;
  let afterGap = false; // the previous day couldn't be valued
  let chainStarted = false;
  let current: MonthRow | null = null;
  let growth = 1;
  let measured = false;

  const finish = () => {
    if (!current) return;
    current.gain =
      current.flowUnknown || current.close == null
        ? null
        : current.close - (current.open ?? 0) - current.netFlow - current.untracked;
    current.twr = current.excludedDays > 0 || !measured ? null : growth - 1;
    rows.push(current);
    if (current.close != null) prevClose = current.close;
  };

  for (const p of points) {
    const month = p.date.slice(0, 7);
    if (!current || current.month !== month) {
      finish();
      current = {
        month,
        year: Number(month.slice(0, 4)),
        monthIndex: Number(month.slice(5, 7)) - 1,
        lastDate: null,
        open: prevClose,
        close: null,
        netFlow: 0,
        untracked: 0,
        gain: null,
        twr: null,
        excludedDays: 0,
        flowUnknown: false,
        partial: month === thisMonth,
      };
      growth = 1;
      measured = false;
    }

    current.netFlow += p.inflow - p.outflow;
    if (!p.flowKnown) current.flowUnknown = true;

    if (p.value == null) {
      // No value: leave the day out and don't trust the step after it either.
      current.excludedDays += 1;
      afterGap = true;
      continue;
    }

    const value = p.value;
    const denominator = prevValue + p.inflow;
    const change = value + p.outflow - prevValue - p.inflow;

    if (!p.flowKnown || afterGap) {
      current.excludedDays += 1;
    } else if (value < 0 || prevValue < 0) {
      // A negative value before the chain starts is skipped; afterwards it's left out.
      if (chainStarted) current.excludedDays += 1;
    } else if (denominator < MIN_RETURN_BASE) {
      // Nothing to measure against: value appearing here wasn't deposited.
      current.untracked += change;
    } else {
      const step = change / denominator;
      if (Number.isFinite(step)) {
        growth *= 1 + step;
        measured = true;
        chainStarted = true;
      } else {
        current.excludedDays += 1;
      }
    }

    afterGap = false;
    current.close = value;
    current.lastDate = p.date;
    prevValue = value;
  }
  finish();
  return rows;
}

/** Rows grouped by year, newest year first; each year has 12 slots (null = no data). */
export function byYear(rows: MonthRow[]): { year: number; months: (MonthRow | null)[] }[] {
  const years = new Map<number, (MonthRow | null)[]>();
  for (const r of rows) {
    if (!years.has(r.year)) years.set(r.year, Array(12).fill(null));
    years.get(r.year)![r.monthIndex] = r;
  }
  return [...years.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => ({ year, months }));
}

/**
 * The year's time-weighted return: its months chained. Months with nothing to
 * measure (before the first deposit) are skipped; a month with days left out
 * makes the whole year unknown, as it does in Wealthfolio.
 */
export function yearReturn(rows: MonthRow[]): number | null {
  if (rows.some((r) => r.excludedDays > 0)) return null;
  const xs = rows.map((r) => r.twr).filter((r): r is number => r != null);
  return xs.length ? xs.reduce((acc, r) => acc * (1 + r), 1) - 1 : null;
}

/** The year's gain or loss: its months added up, unknown if any month's is. */
export function yearGain(rows: MonthRow[]): number | null {
  if (!rows.length || rows.some((r) => r.gain == null)) return null;
  return rows.reduce((a, r) => a + (r.gain ?? 0), 0);
}

/** The last month-end value of the year that Wealthfolio could value. */
export function yearEnd(rows: MonthRow[]): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const close = rows[i].close;
    if (close != null) return close;
  }
  return null;
}

/** Months whose numbers are incomplete, to explain in the UI. */
export function hasGaps(row: MonthRow): boolean {
  return row.excludedDays > 0 || row.flowUnknown;
}

export function change(close: number | null, open: number | null): number | null {
  return close != null && open != null && open > 0 ? close / open - 1 : null;
}

function finite(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function isoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
