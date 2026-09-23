import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSbtcHolders, fetchSbtcSnapshot, SBTC_ASSET } from "./stacks-risk.js";

const supply = { asset_identifier: SBTC_ASSET, total: "100000000000000000000" };
const holders = { total: 100, results: [
  { principal: "SP1234.pool", balance: "50000000000000000000" },
  { principal: "SP5678", balance: "25000000000000000000" },
] };

test("shares use integer arithmetic and identify contract principals", () => {
  const result = analyzeSbtcHolders(supply, holders);
  assert.equal(result.top1SharePct, 50);
  assert.equal(result.top10SharePct, 75);
  assert.equal(result.sampledSharePct, 75);
  assert.equal(result.sampledContractPrincipalCount, 1);
  assert.equal(result.reportedHolderCount, 100);
});

test("rejects inconsistent supply or repeated principals", () => {
  assert.throws(() => analyzeSbtcHolders(supply, { total: 2, results: [holders.results[0], holders.results[0]] }), /Duplicate/);
  assert.throws(() => analyzeSbtcHolders({ ...supply, total: "1" }, holders), /exceed supply/);
});

test("fetch only calls the public supply and holder endpoints", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return { ok: true, json: async () => url.endsWith("/supply") ? supply : holders };
  };
  const report = await fetchSbtcSnapshot({ limit: 25, fetchImpl });
  assert.equal(report.top1SharePct, 50);
  assert.equal(urls.length, 2);
  assert.ok(urls.every((url) => url.startsWith("https://api.hiro.so/extended/v3/tokens/ft/")));
});
