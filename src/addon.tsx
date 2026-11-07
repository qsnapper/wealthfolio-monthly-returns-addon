import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { AddonContext, AddonEnableFunction } from "@wealthfolio/addon-sdk";
import MonthlyReturnsPage from "./pages/monthly-returns-page";

// The host mounts route components itself, without the context, so we keep
// the context from enable() and hand it down. Never call createRoot here.
let addonCtx: AddonContext | undefined;

const MonthlyReturnsRoute = () => {
  if (!addonCtx) return null;
  return (
    <QueryClientProvider client={addonCtx.api.query.getClient() as QueryClient}>
      <MonthlyReturnsPage ctx={addonCtx} />
    </QueryClientProvider>
  );
};

const enable: AddonEnableFunction = (ctx) => {
  addonCtx = ctx;

  // The id must match contributes.routes[].id in manifest.json; the sidebar
  // link is declared there too.
  ctx.router.add({
    id: "monthly-returns",
    path: "/addons/monthly-returns-addon",
    title: "Monthly Returns",
    component: MonthlyReturnsRoute,
  });

  ctx.onDisable(() => {
    addonCtx = undefined;
  });
};

export default enable;
