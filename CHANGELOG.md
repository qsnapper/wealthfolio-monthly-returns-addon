# Changelog

All notable changes to Monthly Returns are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-11-07

### Fixed

- Month columns now share the table width equally, so they line up from
  table to table instead of following their widest value.

### Added

- A screenshot in the README.

## [1.1.0] - 2026-11-07

### Added

- **Deposits** view in the value table: net deposits for each month (money
  moved in minus money moved out) and for the full year. Shown in a neutral
  colour, because a deposit isn't a gain and a withdrawal isn't a loss. A month
  where Wealthfolio doesn't know a deposit's size shows "–".

## [1.0.0] - 2026-11-07

### Added

- First public release.
- **Monthly returns** table: the time-weighted return of each month, or the
  gain or loss in money, with the best and worst months highlighted.
- **Portfolio value by month** table: the value at each month end, or the
  change from the month before.
- Month details on hover: start and end value, net deposits, gain or loss and
  return.
- Returns are worked out the way Wealthfolio's own performance page does. Days
  it can't vouch for (holdings it couldn't value, a deposit of unknown size)
  are left out rather than guessed; the month shows "–" and says why.
- "All accounts" or a single account. Your account and view choices are
  remembered between visits.
- Follows Wealthfolio's privacy mode, number format and gain/loss colours.

[1.1.1]: https://github.com/qsnapper/wealthfolio-monthly-returns-addon/releases/tag/v1.1.1
[1.1.0]: https://github.com/qsnapper/wealthfolio-monthly-returns-addon/releases/tag/v1.1.0
[1.0.0]: https://github.com/qsnapper/wealthfolio-monthly-returns-addon/releases/tag/v1.0.0
