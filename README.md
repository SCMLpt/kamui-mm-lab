# Kamui MM Lab

A local, capital-aware market-making **simulation** for a proposed future Kamui feature. It trains a small linear forecast on generated order-book examples, then tests inventory-aware quotes against new, deterministic synthetic paths. It sends no orders, accepts no deposits, and uses no real exchange or investor data. It is not evidence of investment returns, regulatory approval, or a production market-making system.

## Run

Node.js 18 or later is enough; there are no package dependencies.

```sh
npm start
```

Open `http://127.0.0.1:4174/`. Use the capital and risk controls, select a synthetic market regime, and click **Run simulation**. Run `npm test` for deterministic engine checks.

For a hands-free walkthrough suitable for screen recording, open `http://127.0.0.1:4174/?demo=1`. It operates the same local controls in sequence; no data leaves the machine.

## What is being tested

- A model trained on generated order-book imbalance, recent momentum, and volatility forecasts the next synthetic mid-price move.
- The quoting engine widens spreads under volatility, skews quotes away from accumulated inventory, caps inventory to a fraction of starting capital, and pauses during stress.
- Cash, inventory, marked equity, fees, fills, and drawdown are accounted for on the same synthetic path. The fixed-quote comparison has the same starting capital and order size.

This is a research prototype inspired by inventory-aware market-making concepts, including [Avellaneda and Stoikov (2008)](https://www.math.nyu.edu/faculty/avellane/HighFrequencyTrading.pdf). The implementation and parameters here are original simplified simulation choices, not a copy of any firm's system.

## Limits

Synthetic prices and fill decisions omit venue latency, queue priority, gas, MEV, funding, counterparty risk, outages, and exchange-specific fee schedules. There is no claim that the learned signal generalizes to real markets. A real-money service would need separate legal, operational, security, and venue work.


## Stacks sBTC risk-data proof of concept

Run `node stacks-risk-cli.js --limit=100` to fetch the public sBTC token supply and top holder balances from Hiro’s Stacks mainnet API. The script reports raw top-1, top-10 and top-25 principal shares using integer arithmetic, flags contract principals, and sends no orders or transactions. No wallet, private key or paid API is needed. On 2026-09-23, a 100-holder snapshot found 7,693 reported holders and top-10 principal share of 92.82%. This is address/contract distribution, not beneficial ownership, DEX liquidity or realized market-making performance; the API calls are not an atomic chain-height snapshot. The tool is an early component of a proposed public Stacks liquidity-risk study.

`node bitflow-risk-cli.js` reads Bitflow’s documented public `/ticker` endpoint and reports sBTC pool tickers, provider-reported USD liquidity, 24-hour base-token volume, last-trade age and available bid/ask spreads. It de-duplicates pool IDs. These provider figures are not executable depth, verified TVL or a trading signal. Use `--output=path` to save a dated record. API access is read-only and no key is requested.
