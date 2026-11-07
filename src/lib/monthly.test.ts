import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AccountValuation } from "@wealthfolio/addon-sdk";
import {
  byYear,
  monthDeposits,
  monthlyRows,
  toDayPoints,
  yearDeposits,
  yearEnd,
  yearGain,
  yearReturn,
  type MonthRow,
} from "./monthly.ts";

// Run with `pnpm test`. Node runs this TypeScript file directly.

const TODAY = new Date(2030, 0, 1); // keeps every test month finished

interface Day {
  in?: number;
  out?: number;
  status?: AccountValuation["valueStatus"];
  source?: AccountValuation["externalFlowSource"];
}

/** A daily valuation as Wealthfolio reports it, with only the fields we read. */
function day(date: string, value: number | undefined, d: Day = {}): AccountValuation {
  return {
    valuationDate: date,
    totalValueBase: value,
    externalInflowBase: d.in ?? 0,
    externalOutflowBase: d.out ?? 0,
    externalFlowSource: d.source ?? (d.in || d.out ? "CASH_AMOUNT" : "NO_FLOW"),
    valueStatus: d.status ?? "complete",
  } as unknown as AccountValuation;
}

function months(days: AccountValuation[]): Record<string, MonthRow> {
  return Object.fromEntries(monthlyRows(toDayPoints(days), TODAY).map((r) => [r.month, r]));
}

function close(actual: number | null, expected: number) {
  assert.ok(actual != null, `expected ${expected}, got null`);
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);
}

describe("time-weighted return", () => {
  test("measures price changes", () => {
    const m = months([day("2025-01-01", 100, { in: 100 }), day("2025-01-31", 110)]);
    close(m["2025-01"].twr, 0.1);
    close(m["2025-01"].gain, 10);
  });

  test("a deposit doesn't move it", () => {
    const m = months([day("2025-01-01", 100, { in: 100 }), day("2025-01-15", 200, { in: 100 }), day("2025-01-31", 220)]);
    close(m["2025-01"].twr, 0.1);
    close(m["2025-01"].netFlow, 200);
    close(m["2025-01"].gain, 20);
  });

  test("deposits count at the start of the day and withdrawals at the end, as in Wealthfolio", () => {
    const m = months([
      day("2025-01-01", 100, { in: 100 }),
      day("2025-01-02", 210, { in: 100 }), // (210 - 100 - 100) / (100 + 100) = +5 %
      day("2025-01-03", 160, { out: 50 }), // (160 + 50 - 210) / 210 = 0 %
    ]);
    close(m["2025-01"].twr, 0.05);
  });

  test("chains months into a year", () => {
    const rows = monthlyRows(
      toDayPoints([day("2025-01-01", 100, { in: 100 }), day("2025-01-31", 110), day("2025-02-28", 121)]),
      TODAY,
    );
    close(yearReturn(rows), 0.21);
    close(yearGain(rows), 21);
  });
});

describe("days Wealthfolio can't vouch for", () => {
  test("an unvalued day is left out, not read as a -100 % crash", () => {
    const m = months([
      day("2025-01-01", 100, { in: 100 }),
      day("2025-01-31", 100),
      day("2025-02-10", 0, { status: "unavailable" }),
      day("2025-02-11", 100),
      day("2025-02-28", 110),
    ]);
    const feb = m["2025-02"];
    assert.equal(feb.twr, null);
    assert.equal(feb.excludedDays, 2); // the gap and the step out of it
    close(feb.gain, 10); // start and end are known, so the gain still is
    assert.equal(feb.untracked, 0);
    close(feb.close, 110);
  });

  test("a missing value is never treated as zero", () => {
    const m = months([day("2025-01-01", 100, { in: 100 }), day("2025-01-15", undefined), day("2025-01-31", 110)]);
    assert.equal(m["2025-01"].twr, null);
    assert.equal(m["2025-01"].excludedDays, 2);
    close(m["2025-01"].gain, 10);
  });

  test("a month with a day left out makes the year unknown", () => {
    const rows = monthlyRows(
      toDayPoints([
        day("2025-01-01", 100, { in: 100 }),
        day("2025-01-31", 110),
        day("2025-02-10", 0, { status: "unavailable" }),
        day("2025-02-28", 121),
      ]),
      TODAY,
    );
    assert.equal(yearReturn(rows), null);
  });

  test("holdings arriving with no known deposit size are left out, gain included", () => {
    const m = months([
      day("2025-01-01", 100, { in: 100 }),
      day("2025-01-31", 100),
      day("2025-02-10", 1100, { source: "UNPRICED_HOLDINGS_TRANSITION" }),
      day("2025-02-28", 1100),
    ]);
    const feb = m["2025-02"];
    assert.equal(feb.twr, null);
    assert.equal(feb.gain, null);
    assert.equal(feb.flowUnknown, true);
    const rows = Object.values(m);
    assert.equal(yearReturn(rows), null);
    assert.equal(yearGain(rows), null);
  });

  test("a negative value is left out once returns have started", () => {
    const m = months([day("2025-01-01", 100, { in: 100 }), day("2025-01-15", -5), day("2025-01-31", 100)]);
    assert.equal(m["2025-01"].twr, null);
    assert.ok(m["2025-01"].excludedDays > 0);
  });
});

describe("value with no recorded deposit", () => {
  test("is kept out of the gain and the return", () => {
    const m = months([day("2025-01-01", 500), day("2025-01-31", 550)]);
    const jan = m["2025-01"];
    close(jan.untracked, 500);
    close(jan.gain, 50);
    close(jan.twr, 0.1);
    assert.equal(jan.excludedDays, 0);
  });

  test("an account emptied and refilled without a deposit isn't a gain", () => {
    const m = months([
      day("2025-01-01", 100, { in: 100 }),
      day("2025-01-10", 0, { out: 100 }),
      day("2025-01-20", 300),
      day("2025-01-31", 300),
    ]);
    const jan = m["2025-01"];
    close(jan.untracked, 300);
    close(jan.gain, 0);
    close(jan.twr, 0);
  });
});

describe("months and years", () => {
  test("a month with no valued day has no close, and the next month opens from the last known one", () => {
    const m = months([
      day("2025-01-01", 100, { in: 100 }),
      day("2025-01-31", 100),
      day("2025-02-15", 0, { status: "unavailable" }),
      day("2025-03-31", 120),
    ]);
    assert.equal(m["2025-02"].close, null);
    assert.equal(m["2025-02"].lastDate, null);
    assert.equal(m["2025-02"].gain, null);
    close(m["2025-03"].open, 100);
  });

  test("the year end is the last month that has a value", () => {
    const rows = monthlyRows(
      toDayPoints([day("2025-11-30", 100, { in: 100 }), day("2025-12-15", 0, { status: "unavailable" })]),
      TODAY,
    );
    close(yearEnd(rows), 100);
  });

  test("months before the first deposit don't stop the year's return", () => {
    const rows = monthlyRows(
      toDayPoints([day("2025-01-15", 0), day("2025-02-01", 100, { in: 100 }), day("2025-02-28", 110)]),
      TODAY,
    );
    assert.equal(rows[0].twr, null);
    close(yearReturn(rows), 0.1);
  });

  test("the current month is marked as partial", () => {
    const rows = monthlyRows(toDayPoints([day("2025-01-01", 100, { in: 100 }), day("2025-02-03", 100)]), new Date(2025, 1, 10));
    assert.deepEqual(
      rows.map((r) => r.partial),
      [false, true],
    );
  });

  test("groups by year, newest first, January to December", () => {
    const years = byYear(
      monthlyRows(toDayPoints([day("2024-12-31", 100, { in: 100 }), day("2025-03-31", 100)]), TODAY),
    );
    assert.deepEqual(
      years.map((y) => y.year),
      [2025, 2024],
    );
    assert.equal(years[0].months[2]?.month, "2025-03");
    assert.equal(years[1].months[11]?.month, "2024-12");
  });
});

describe("net deposits", () => {
  test("are deposits minus withdrawals, per month and per year", () => {
    const m = months([
      day("2025-01-01", 100, { in: 100 }),
      day("2025-01-15", 150, { in: 50 }),
      day("2025-02-10", 120, { out: 30 }),
    ]);
    close(monthDeposits(m["2025-01"]), 150);
    close(monthDeposits(m["2025-02"]), -30);
    close(yearDeposits(Object.values(m)), 120);
  });

  test("leave out value added without a deposit", () => {
    const m = months([day("2025-01-01", 500), day("2025-01-31", 550, { in: 20 })]);
    close(m["2025-01"].untracked, 500);
    close(monthDeposits(m["2025-01"]), 20);
  });

  test("are unknown when Wealthfolio doesn't know a size, and so is the year", () => {
    const m = months([
      day("2025-01-01", 100, { in: 100 }),
      day("2025-02-10", 1100, { source: "UNKNOWN_BOUNDARY_TRANSFER" }),
    ]);
    close(monthDeposits(m["2025-01"]), 100);
    assert.equal(monthDeposits(m["2025-02"]), null);
    assert.equal(yearDeposits(Object.values(m)), null);
  });
});
