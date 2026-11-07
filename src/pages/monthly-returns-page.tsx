import type { AddonContext } from "@wealthfolio/addon-sdk";
import {
  Card,
  CardContent,
  CardHeader,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Icons,
  Page,
  PageContent,
  PageHeader,
  ResponsiveSelect,
  Skeleton,
  useBalancePrivacy,
} from "@wealthfolio/ui";
import { useEffect, useMemo, type ReactNode } from "react";
import { MonthlyReturnsCard, RETURN_MODES, type ReturnMode } from "../components/monthly-returns-card";
import { VALUE_MODES, ValueCard, type ValueMode } from "../components/value-card";
import { PORTFOLIO_ID, useAccounts, useValuationHistory } from "../hooks/use-data";
import { oneOf, useStoredState } from "../hooks/use-stored-state";
import { byYear, monthlyRows, toDayPoints } from "../lib/monthly";

const HEADING = "Monthly Returns";

export default function MonthlyReturnsPage({ ctx }: { ctx: AddonContext }) {
  const { isBalanceHidden } = useBalancePrivacy();
  const [accountId, setAccountId, accountLoaded] = useStoredState<string>(ctx, "accountId", PORTFOLIO_ID);
  const [returnMode, setReturnMode, returnLoaded] = useStoredState<ReturnMode>(
    ctx,
    "returnMode",
    "percent",
    oneOf(RETURN_MODES),
  );
  const [valueMode, setValueMode, valueLoaded] = useStoredState<ValueMode>(ctx, "valueMode", "value", oneOf(VALUE_MODES));
  // Wait for the saved choices, so the page doesn't load "All accounts" and then switch.
  const settingsLoaded = accountLoaded && returnLoaded && valueLoaded;

  const accounts = useAccounts(ctx);
  const options = useMemo(
    () => [
      { value: PORTFOLIO_ID, label: "All accounts" },
      ...(accounts.data ?? [])
        .filter((a) => a.isActive && !a.isArchived)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => ({ value: a.id, label: a.name })),
    ],
    [accounts.data],
  );
  // An account that was archived or deleted since the last visit falls back to the total.
  const selected = options.some((o) => o.value === accountId) || accounts.isLoading ? accountId : PORTFOLIO_ID;

  const valuations = useValuationHistory(ctx, selected, settingsLoaded);
  useEffect(() => {
    if (valuations.error) ctx.api.logger.error(`Couldn't load valuations: ${String(valuations.error)}`);
  }, [ctx, valuations.error]);
  const rows = useMemo(() => monthlyRows(toDayPoints(valuations.data ?? [])), [valuations.data]);
  const years = useMemo(() => byYear(rows), [rows]);
  // The amounts are in the base currency the valuations report, as in Wealthfolio itself.
  const currency = valuations.data?.[0]?.baseCurrency;

  const actions = (
    <ResponsiveSelect
      aria-label="Account"
      value={selected}
      onValueChange={setAccountId}
      options={options}
      sheetTitle="Account"
      triggerClassName="w-50"
    />
  );

  let content: ReactNode;
  if (!settingsLoaded || valuations.isLoading) {
    content = <LoadingCards />;
  } else if (valuations.isError) {
    content = (
      <Notice
        icon={<Icons.AlertTriangle />}
        title="Couldn't load the values"
        description="Try again in a moment. If it keeps failing, open the account in Wealthfolio and choose Recalculate History."
      />
    );
  } else if (!rows.length || !currency) {
    content = (
      <Notice
        icon={<Icons.CalendarDots />}
        title="Nothing to show yet"
        description="Wealthfolio has no daily values for this selection yet. Add activities or holdings and the tables fill in."
      />
    );
  } else {
    content = (
      <>
        <MonthlyReturnsCard
          years={years}
          currency={currency}
          isHidden={isBalanceHidden}
          mode={returnMode}
          onModeChange={setReturnMode}
        />
        <ValueCard
          years={years}
          currency={currency}
          isHidden={isBalanceHidden}
          mode={valueMode}
          onModeChange={setValueMode}
          scope={selected === PORTFOLIO_ID ? "portfolio" : "account"}
        />
      </>
    );
  }

  return (
    <Page>
      <PageHeader heading={HEADING} text="Returns and value, month by month" actions={actions} />
      <PageContent className="space-y-6">{content}</PageContent>
    </Page>
  );
}

function Notice({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Empty className="border-border/50 mx-auto w-full max-w-105 border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">{icon}</EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

function LoadingCards() {
  return (
    <>
      {[0, 1].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
