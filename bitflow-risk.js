/** Read-only summary of Bitflow's public ticker feed. No wallet or orders. */
export const SBTC_CONTRACT = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";
export const BITFLOW_TICKER_URL = "https://bitflow-sdk-api-gateway-7owjsmt8.uc.gateway.dev/ticker";

function finiteNonnegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function analyzeBitflowTickers(tickers, observedAt = new Date().toISOString()) {
  if (!Array.isArray(tickers)) throw new Error("Expected Bitflow ticker array");
  const now = Date.parse(observedAt) / 1000;
  if (!Number.isFinite(now)) throw new Error("Invalid observation time");
  const byPool = new Map();
  for (const ticker of tickers) {
    if (ticker?.base_currency !== SBTC_CONTRACT && ticker?.target_currency !== SBTC_CONTRACT) continue;
    if (typeof ticker.pool_id !== "string" || !ticker.pool_id || !finiteNonnegative(ticker.liquidity_in_usd)) {
      throw new Error("Invalid sBTC pool ticker");
    }
    if (!byPool.has(ticker.pool_id)) byPool.set(ticker.pool_id, ticker);
  }
  const pools = [...byPool.values()].map((ticker) => {
    const ageHours = Number.isInteger(ticker.last_trade_time) && ticker.last_trade_time <= now
      ? Math.round((now - ticker.last_trade_time) / 36) / 100
      : null;
    const bid = ticker.bid;
    const ask = ticker.ask;
    const spreadBps = typeof bid === "number" && typeof ask === "number" && bid > 0 && ask >= bid
      ? Math.round(((ask - bid) / ((ask + bid) / 2)) * 10000)
      : null;
    return {
      poolId: ticker.pool_id,
      pair: `${ticker.base_currency} / ${ticker.target_currency}`,
      reportedLiquidityUsd: ticker.liquidity_in_usd,
      baseVolume24h: finiteNonnegative(ticker.base_volume) ? ticker.base_volume : null,
      lastTradeTime: Number.isInteger(ticker.last_trade_time) ? new Date(ticker.last_trade_time * 1000).toISOString() : null,
      lastTradeAgeHours: ageHours,
      reportedBidAskSpreadBps: spreadBps,
    };
  }).sort((a, b) => b.reportedLiquidityUsd - a.reportedLiquidityUsd);
  return {
    observedAt,
    source: "Bitflow public /ticker endpoint",
    sBtcPoolCount: pools.length,
    sumOfReportedPoolLiquidityUsd: Math.round(pools.reduce((sum, pool) => sum + pool.reportedLiquidityUsd, 0) * 100) / 100,
    pools,
    interpretation: "Provider-reported ticker liquidity is not executable depth, an audit, or a profit measure. Pools may use different quote assets. Missing bid/ask or trade timestamps are left null; staleness matters.",
  };
}

export async function fetchBitflowSnapshot({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(BITFLOW_TICKER_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Bitflow public API HTTP ${response.status}`);
  return analyzeBitflowTickers(await response.json());
}
