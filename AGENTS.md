# AGENTS.md

Guidance for AI coding agents (and humans) working on these add-ons.

## Rules

1. **Read-only.** Add-ons here only read Wealthfolio data. Ask before adding any
   permission that writes (activities, accounts, settings, quotes).
2. **English only.** UI text, identifiers, comments and docs are in English, in a
   plain, friendly tone.
3. **Wealthfolio's design system.** Build pages from `@wealthfolio/ui`
   (`Page`, `PageHeader`, `Card`, `Table`, `AnimatedToggleGroup`,
   `ResponsiveSelect`, `Empty`, `Skeleton`…) and its theme tokens
   (`text-gain`, `text-loss`, `text-muted-foreground`, `bg-gain-subtle`…).
   No custom colours or fonts; gains and losses follow the user's colour setting.
   Add-ons ship no CSS of their own: they get Wealthfolio's stylesheet, so a
   Tailwind class works only if Wealthfolio uses it too. Prefer scale classes
   (`w-50`, `max-w-105`) over arbitrary values (`w-[200px]`), and grep
   Wealthfolio's source for any class you're unsure of.
   Numbers are right-aligned, headers included; labels are left-aligned.
   Amounts are in the `baseCurrency` the data reports; never assume a currency.
4. **Respect privacy mode.** Amounts go through `useBalancePrivacy()`.
5. **Format with the host.** Use `useAmountFormatting()` / `useNumberFormatting()`
   so numbers follow the user's region.
6. **Least permissions.** List only the functions you call in `manifest.json`.
7. **Don't guess.** When data can't be explained (a value with no recorded
   deposit, a missing day), keep it out of returns and say so in the UI.
8. **Sandbox.** No `localStorage` (use `ctx.api.storage`), no network, no
   `createRoot`: the host mounts route components.
9. **Keep it listable.** This repo is listed in Wealthfolio's community
   directory, which reads `manifest.json` and `LICENSE` from the repository
   root and needs `sdkVersion` 3.6 or newer. Keep one add-on per repo, the
   manifest at the root, and the manifest `id` equal to the listing id
   (`monthly-returns-addon`). Never imply the add-on is official.

## Verify

`pnpm type-check`, `pnpm test` and `pnpm build`, then load the add-on in Wealthfolio
(dev server or the bundled zip) and compare a few months with Wealthfolio's own
performance page.

## Release

Bump `version` in `package.json` **and** `manifest.json`, add a matching
`## [x.y.z]` section to `CHANGELOG.md`, commit, then push a `vx.y.z` tag. The
release workflow refuses a tag that doesn't match both files or has no
changelog section.

## Reference

- **Wealthfolio source:** <https://github.com/wealthfolio/wealthfolio>. Clone it
  somewhere temporary to check things; it is not part of this repo.
  - `packages/addon-sdk`: the add-on API (`ctx.api.*`) and the manifest types.
  - `packages/ui/src`: the components, `lib/formatting.ts` (number formats)
    and `components/financial` (how gains and amounts are shown).
  - `apps/frontend/src/addons/iframe`: the sandbox, including how styles reach
    add-ons.
  - `crates/portfolio-engine/src/compile.rs`: what counts as an external flow.
- **Directory rules:** `CONTRIBUTING.md` and `POLICIES.md` in the add-ons repo
  below: what a community listing needs and what it attests to.
- **Official example add-ons:** <https://github.com/wealthfolio/wealthfolio-addons>,
  for example `official/investment-fees-tracker-addon`. This repo's build setup
  follows it.

## Things that caught us out

- **All accounts:** call `getHistoricalValuations()` without an account id. That
  sums the investment accounts. The old `"TOTAL"` id fails in 3.12.
- **Trust Wealthfolio's quality flags:** each valuation has `valueStatus` and
  `externalFlowSource`. Skip what Wealthfolio's own TWR skips
  (`crates/portfolio-engine/src/measure.rs`): an `unavailable` value, an
  unknown flow source, negative values. One unpriced day read as zero once
  made a whole year show −100 %. `src/lib/monthly.test.ts` covers these cases.
- **It isn't net worth:** these valuations leave out alternative assets and
  liabilities, so call it portfolio value.
- **Gain or loss:** only deposits, withdrawals and transfers in or out of
  Wealthfolio are external flows. Dividends, interest, fees, taxes and currency
  moves are part of the gain, not flows.
- **Right-aligning:** use `text-end`, not `text-right`. Wealthfolio only writes
  `rtl:text-right`, so a plain `.text-right` rule never reaches add-ons and the
  browser defaults win (centred headers and buttons, left-aligned cells).
- **Compact amounts:** `formatCompactAmount` writes the locale's own words
  ("12,3 mil €"), so the tables use their own k/M format (`src/lib/format.ts`),
  with the same decimals, always shown so a column reads evenly.
