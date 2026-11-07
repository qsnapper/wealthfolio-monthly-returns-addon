# Monthly Returns for Wealthfolio

[![Latest release](https://img.shields.io/github/v/release/qsnapper/wealthfolio-monthly-returns-addon?style=flat-square)](https://github.com/qsnapper/wealthfolio-monthly-returns-addon/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/qsnapper/wealthfolio-monthly-returns-addon/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/qsnapper/wealthfolio-monthly-returns-addon/actions/workflows/ci.yml)
[![Licence](https://img.shields.io/badge/licence-MIT-blue?style=flat-square)](LICENSE)
![Wealthfolio 3.12+](https://img.shields.io/badge/Wealthfolio-%E2%89%A5%203.12-6366f1?style=flat-square)

A [Wealthfolio](https://wealthfolio.app) add-on that shows your returns and
portfolio value month by month, one year per row.

- **Monthly returns**: the time-weighted return of each month (deposits and
  withdrawals don't affect it), or the gain or loss in money. The best and worst
  months are highlighted.
- **Portfolio value by month** (or **Account value**, for a single account): the
  value at each month end, how much it changed from the month before
  (deposits and withdrawals included), or your net deposits for each month.

Hover a month to see its start and end value, net deposits, gain or loss and
return. Pick "All accounts" or a single account at the top right. Amounts follow
Wealthfolio's privacy mode, number format and gain/loss colours.

"All accounts" covers your investment accounts. It is not Wealthfolio's net
worth, which also counts alternative assets and liabilities.

## Install

1. Download **`monthly-returns-addon-<version>.zip`** from the
   [latest release](https://github.com/qsnapper/wealthfolio-monthly-returns-addon/releases/latest).
2. In Wealthfolio, go to **Settings → Add-ons → Install from file** and pick the
   zip.
3. Review the permissions and approve.
4. **Monthly** appears in the sidebar.

Requires Wealthfolio 3.12 or newer.

## Privacy and permissions

Everything stays on your device. The add-on makes no network requests and
doesn't ask for network access, so Wealthfolio's sandbox would block any.
It only reads data and never changes anything in Wealthfolio.

| Permission | Why |
| --- | --- |
| `portfolio.getHistoricalValuations` | Daily portfolio and account values, to build the tables |
| `accounts.getAll` | The account picker |

It also uses the add-on storage every add-on gets, to remember which account and
view you picked.

## How the numbers are made

Everything comes from Wealthfolio's daily valuations (`getHistoricalValuations`),
in your base currency:

- *Net deposits*: money and securities moved in from outside, minus what was
  moved out (Wealthfolio's external flows).
- *Gain or loss* = end value − start value − net deposits. It includes price
  changes, dividends, interest, fees, taxes and currency moves.
- *Time-weighted return* chains daily returns the way Wealthfolio does, with
  deposits counted at the start of the day and withdrawals at the end:
  `(value + withdrawals − yesterday − deposits) / (yesterday + deposits)`.
- A value that appears with no recorded deposit (for example a holdings-only
  account) is shown as "Added without a deposit" and kept out of both.
- Days Wealthfolio can't vouch for (holdings it couldn't value, a deposit of
  unknown size, a negative value) are left out, as Wealthfolio's own
  performance page does. That month's return shows "–", and hovering it says
  why. A year with such a month has no full-year return.
- *Full year*: the months' returns chained, or their gains and losses added up.
  *Year end*: the last value of the year (the latest one for the current year).

These are figures for your own overview, not financial or tax advice. If a
month looks different from Wealthfolio's own performance page, please
[open an issue](https://github.com/qsnapper/wealthfolio-monthly-returns-addon/issues).

## Develop

Requires Node 22.18+ and pnpm.

```bash
pnpm install
pnpm dev:server      # serves the add-on on http://localhost:3001
```

Then run Wealthfolio in add-on dev mode (from a Wealthfolio checkout):
`VITE_ENABLE_ADDON_DEV_MODE=true pnpm tauri dev`.

To test and build the zip yourself:

```bash
pnpm type-check
pnpm test            # the monthly calculations, in src/lib/monthly.test.ts
pnpm bundle          # creates dist/monthly-returns-addon-<version>.zip
```

[AGENTS.md](AGENTS.md) has the conventions this add-on follows.

## Releasing

1. Bump `version` in both `package.json` and `manifest.json`.
2. Add a `## [x.y.z]` section to [CHANGELOG.md](CHANGELOG.md).
3. Commit, then tag and push: `git tag vx.y.z && git push origin vx.y.z`.

The release workflow checks that the versions match the tag, builds the zip and
publishes a GitHub release with that version's changelog notes.

## Licence

[MIT](LICENSE) © qsnapper

Monthly Returns is an independent add-on. It is not made, endorsed or supported
by Wealthfolio.
