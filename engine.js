const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** All observations and executions here are invented. No market data is fetched. */
export function generateMarket(seed = 42, regime = "range", count = 240) {
  const rng = random(seed);
  const ticks = [];
  let mid = 100;
  let previousReturnBps = 0;
  let previousImbalance = 0;

  for (let i = 0; i < count; i++) {
    const shockWindow = regime === "shock" && i >= 100 && i < 155;
    const volatilityBps = shockWindow ? 25 + rng() * 18 : regime === "trend" ? 6 + rng() * 6 : 3 + rng() * 5;
    const imbalance = clamp(previousImbalance * 0.35 + (rng() - 0.5) * 1.45, -1, 1);
    const trendBps = regime === "trend" ? 1.3 : 0;
    const shockBps = shockWindow ? (i < 120 ? -8 : 2.8) : 0;
    const noiseBps = (rng() + rng() + rng() - 1.5) * volatilityBps * 0.34;
    const nextReturnBps = imbalance * 3.4 + previousReturnBps * 0.16 + trendBps + shockBps + noiseBps;
    const flowSide = rng() < clamp(0.5 + imbalance * 0.28, 0.1, 0.9) ? 1 : -1;
    const aggressionBps = 1.5 + rng() * 13 + (shockWindow ? rng() * 10 : 0);

    ticks.push({
      step: i + 1,
      mid,
      imbalance,
      momentumBps: previousReturnBps,
      volatilityBps,
      flowSide,
      aggressionBps,
      nextReturnBps,
    });

    mid *= 1 + nextReturnBps / 10000;
    previousReturnBps = nextReturnBps;
    previousImbalance = imbalance;
  }
  return ticks;
}

function features(tick) {
  return [tick.imbalance, tick.momentumBps / 10, tick.volatilityBps / 20];
}

/** Simple regularized linear regression trained from scratch on synthetic ticks. */
export function trainModel(trainingTicks = generateMarket(921, "trend", 480)) {
  const split = Math.floor(trainingTicks.length * 0.8);
  const training = trainingTicks.slice(0, split);
  const holdout = trainingTicks.slice(split);
  const dimensions = 3;
  const means = Array.from({ length: dimensions }, (_, j) => training.reduce((sum, tick) => sum + features(tick)[j], 0) / training.length);
  const deviations = means.map((mean, j) => Math.sqrt(training.reduce((sum, tick) => sum + (features(tick)[j] - mean) ** 2, 0) / training.length) || 1);
  const normalized = (tick) => features(tick).map((value, j) => (value - means[j]) / deviations[j]);
  const weights = [0, 0, 0];
  let intercept = 0;
  const learningRate = 0.018;

  for (let epoch = 0; epoch < 550; epoch++) {
    let biasGradient = 0;
    const gradients = [0, 0, 0];
    for (const tick of training) {
      const x = normalized(tick);
      const prediction = intercept + weights.reduce((sum, weight, j) => sum + weight * x[j], 0);
      const error = prediction - tick.nextReturnBps;
      biasGradient += error;
      for (let j = 0; j < dimensions; j++) gradients[j] += error * x[j];
    }
    intercept -= learningRate * biasGradient / training.length;
    for (let j = 0; j < dimensions; j++) weights[j] -= learningRate * (gradients[j] / training.length + weights[j] * 0.015);
  }

  const predict = (tick) => clamp(intercept + weights.reduce((sum, weight, j) => sum + weight * normalized(tick)[j], 0), -12, 12);
  const holdoutRmseBps = Math.sqrt(holdout.reduce((sum, tick) => sum + (predict(tick) - tick.nextReturnBps) ** 2, 0) / holdout.length);
  return { predict, weights, intercept, holdoutRmseBps, trainingCount: training.length, holdoutCount: holdout.length };
}

export function makeQuote(tick, state, config, predictionBps, adaptive = true) {
  const capital = config.capital;
  const maxInventoryValue = capital * config.maxInventoryPct / 100;
  const inventoryValue = state.inventory * tick.mid;
  const inventoryRatio = maxInventoryValue > 0 ? inventoryValue / maxInventoryValue : 0;
  if (adaptive && tick.volatilityBps > config.volatilityStopBps) {
    return { bid: null, ask: null, pauseReason: "Volatility stop", predictionBps, inventoryRatio };
  }

  const skewBps = adaptive ? (inventoryRatio - 0.5) * 14 : 0;
  const fairBps = adaptive ? predictionBps - skewBps : 0;
  const halfSpreadBps = adaptive
    ? 2.5 + config.feeBps + tick.volatilityBps * 0.24
    : 5.5 + config.feeBps;
  const bid = state.cash > 0.5 && inventoryValue < maxInventoryValue - 0.5
    ? tick.mid * (1 + (fairBps - halfSpreadBps) / 10000)
    : null;
  const ask = state.inventory * tick.mid > 0.5
    ? tick.mid * (1 + (fairBps + halfSpreadBps) / 10000)
    : null;
  return { bid, ask, pauseReason: bid === null && ask === null ? "Capital limit" : null, predictionBps, inventoryRatio };
}

function runStrategy(path, config, model, adaptive) {
  const initialMid = path[0].mid;
  const initialInventoryValue = config.capital * Math.min(0.25, config.maxInventoryPct / 200);
  const state = {
    cash: config.capital - initialInventoryValue,
    inventory: initialInventoryValue / initialMid,
  };
  const marks = [];
  const events = [];
  let fills = 0;
  let paused = 0;
  let feesPaid = 0;
  let peakEquity = config.capital;
  let maxDrawdownPct = 0;
  let peakInventoryPct = initialInventoryValue / config.capital * 100;

  for (const tick of path) {
    const predictionBps = model.predict(tick);
    const quote = makeQuote(tick, state, config, predictionBps, adaptive);
    let event = null;
    if (quote.pauseReason) {
      paused++;
      events.push({ step: tick.step, kind: "pause", detail: quote.pauseReason });
    } else {
      const orderValue = config.capital * 0.04;
      const maxInventoryValue = config.capital * config.maxInventoryPct / 100;
      if (tick.flowSide > 0 && quote.ask !== null && tick.aggressionBps >= (quote.ask / tick.mid - 1) * 10000) {
        const units = Math.min(orderValue / quote.ask, state.inventory);
        if (units > 0) {
          const value = units * quote.ask;
          const fee = value * config.feeBps / 10000;
          state.inventory -= units;
          state.cash += value - fee;
          feesPaid += fee;
          fills++;
          event = { step: tick.step, kind: "ask", detail: `Sell ${units.toFixed(3)} @ ${quote.ask.toFixed(2)}` };
        }
      } else if (tick.flowSide < 0 && quote.bid !== null && tick.aggressionBps >= (1 - quote.bid / tick.mid) * 10000) {
        const affordable = state.cash / (quote.bid * (1 + config.feeBps / 10000));
        const inventoryRoom = Math.max(0, (maxInventoryValue - state.inventory * tick.mid) / quote.bid);
        const units = Math.min(orderValue / quote.bid, affordable, inventoryRoom);
        if (units > 0) {
          const value = units * quote.bid;
          const fee = value * config.feeBps / 10000;
          state.inventory += units;
          state.cash -= value + fee;
          feesPaid += fee;
          fills++;
          event = { step: tick.step, kind: "bid", detail: `Buy ${units.toFixed(3)} @ ${quote.bid.toFixed(2)}` };
        }
      }
      if (event) events.push(event);
    }

    const equity = state.cash + state.inventory * tick.mid;
    peakEquity = Math.max(peakEquity, equity);
    maxDrawdownPct = Math.max(maxDrawdownPct, (peakEquity - equity) / peakEquity * 100);
    const inventoryPct = state.inventory * tick.mid / config.capital * 100;
    peakInventoryPct = Math.max(peakInventoryPct, inventoryPct);
    marks.push({
      step: tick.step,
      mid: tick.mid,
      equity,
      cash: state.cash,
      inventory: state.inventory,
      inventoryPct,
      predictionBps,
      volatilityBps: tick.volatilityBps,
      bid: quote.bid,
      ask: quote.ask,
      pauseReason: quote.pauseReason,
      fillKind: event?.kind ?? null,
    });
  }

  const finalMid = path.at(-1).mid;
  const finalEquity = state.cash + state.inventory * finalMid;
  return {
    marks,
    events,
    metrics: {
      startingCapital: config.capital,
      finalEquity,
      pnl: finalEquity - config.capital,
      pnlPct: (finalEquity / config.capital - 1) * 100,
      maxDrawdownPct,
      peakInventoryPct,
      fills,
      paused,
      quoteUptimePct: (path.length - paused) / path.length * 100,
      feesPaid,
      endingCash: state.cash,
      endingInventory: state.inventory,
    },
  };
}

export function runSimulation(input = {}) {
  const config = {
    capital: clamp(Number(input.capital ?? 750), 100, 10000),
    maxInventoryPct: clamp(Number(input.maxInventoryPct ?? 45), 10, 80),
    volatilityStopBps: clamp(Number(input.volatilityStopBps ?? 18), 8, 50),
    feeBps: 1,
    scenario: ["range", "trend", "shock"].includes(input.scenario) ? input.scenario : "range",
  };
  const seed = { range: 414, trend: 815, shock: 1301 }[config.scenario];
  const path = generateMarket(seed, config.scenario, 240);
  const model = trainModel();
  return {
    config,
    path,
    model: {
      weights: model.weights,
      intercept: model.intercept,
      holdoutRmseBps: model.holdoutRmseBps,
      trainingCount: model.trainingCount,
      holdoutCount: model.holdoutCount,
    },
    adaptive: runStrategy(path, config, model, true),
    fixed: runStrategy(path, config, model, false),
  };
}
