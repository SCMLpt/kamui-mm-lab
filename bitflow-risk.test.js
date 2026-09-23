import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBitflowTickers, fetchBitflowSnapshot, SBTC_CONTRACT, BITFLOW_TICKER_URL } from "./bitflow-risk.js";

const tickers = [
  { pool_id: "SP123.pool", base_currency: SBTC_CONTRACT, target_currency: "Stacks", liquidity_in_usd: 1234.56, base_volume: 2, last_trade_time: 1790000000, bid: 99, ask: 101 },
  { pool_id: "SP123.pool", base_currency: SBTC_CONTRACT, target_currency: "Stacks", liquidity_in_usd: 1234.56, base_volume: 2, last_trade_time: 1790000000 },
  { pool_id: "SP456.pool", base_currency: "other", target_currency: "other2", liquidity_in_usd: 999 },
];

test("filters to unique sBTC pools and does not conflate liquidity with depth", () => {
  const report = analyzeBitflowTickers(tickers, "2026-09-23T00:00:00.000Z");
  assert.equal(report.sBtcPoolCount, 1);
  assert.equal(report.sumOfReportedPoolLiquidityUsd, 1234.56);
  assert.equal(report.pools[0].reportedBidAskSpreadBps, 200);
  assert.match(report.interpretation, /not executable depth/);
});

test("rejects malformed sBTC liquidity", () => {
  assert.throws(() => analyzeBitflowTickers([{ ...tickers[0], liquidity_in_usd: -1 }]), /Invalid/);
});

test("reads only the documented public ticker endpoint", async () => {
  let requested;
  const report = await fetchBitflowSnapshot({ fetchImpl: async (url) => {
    requested = url;
    return { ok: true, json: async () => tickers };
  }});
  assert.equal(requested, BITFLOW_TICKER_URL);
  assert.equal(report.sBtcPoolCount, 1);
});
