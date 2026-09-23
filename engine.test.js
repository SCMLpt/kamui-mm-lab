import test from "node:test";
import assert from "node:assert/strict";
import { generateMarket, makeQuote, runSimulation, trainModel } from "./engine.js";

test("synthetic paths and model are reproducible", () => {
  assert.deepEqual(generateMarket(8, "range", 5), generateMarket(8, "range", 5));
  const modelA = trainModel();
  const modelB = trainModel();
  assert.deepEqual(modelA.weights, modelB.weights);
  assert.ok(modelA.holdoutRmseBps > 0);
});

test("risk gate pauses both sides above the volatility stop", () => {
  const tick = { mid: 100, volatilityBps: 30 };
  const quote = makeQuote(tick, { cash: 500, inventory: 2 }, { capital: 1000, maxInventoryPct: 50, volatilityStopBps: 18, feeBps: 1 }, 0);
  assert.equal(quote.pauseReason, "Volatility stop");
  assert.equal(quote.bid, null);
  assert.equal(quote.ask, null);
});

test("position and cash remain bounded across the synthetic shock", () => {
  const result = runSimulation({ capital: 300, maxInventoryPct: 35, volatilityStopBps: 18, scenario: "shock" });
  assert.ok(result.adaptive.metrics.paused > 0);
  assert.ok(result.adaptive.marks.every((mark) => mark.cash >= -1e-8));
  assert.ok(result.adaptive.marks.every((mark) => mark.inventory >= -1e-8));
  assert.ok(result.adaptive.marks.every((mark) => mark.inventoryPct <= 35.5));
  assert.equal(result.adaptive.marks.length, 240);
});

test("simulation metrics reconcile to the final marked ledger", () => {
  const result = runSimulation({ capital: 750, scenario: "range" });
  const last = result.adaptive.marks.at(-1);
  assert.ok(Math.abs(last.equity - result.adaptive.metrics.finalEquity) < 1e-9);
  assert.ok(Math.abs(result.adaptive.metrics.pnl - (last.equity - 750)) < 1e-9);
  assert.ok(result.adaptive.metrics.fills > 0);
});
