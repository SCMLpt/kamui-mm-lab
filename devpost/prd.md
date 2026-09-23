---
doc: prd
status: draft
---
# Kamui MM Lab — Product Requirements

## What We're Building

Kamui MM Lab: an interactive, synthetic market-making research demo for the proposed capital-light MM direction. It is explicitly a simulator.

## Core Journey

1. Open the local page and see a synthetic-only notice.
2. Set starting capital, position cap, and volatility stop; select a regime.
3. Run the simulation and inspect quotes, model signal, fill count, equity path, drawdown, and pauses.
4. Change a control or scenario and rerun to see the risk trade-off.

## Screens and Layout

One page. A clear synthetic-only explanation sits above a side-by-side control panel and results dashboard. A chart, model signal card, capital footprint, and recent event list make the run inspectable. On narrow screens, the panels stack.

## Look and Feel

Use a dense but legible dark Kamui research aesthetic, with lime reserved for active controls and the risk-aware path. The status and warnings should be explicit rather than promotional. This is an implementation direction inferred from the user's Kamui brand context, not a separately approved visual specification.

## Features and Behavior

- Each scenario has a fixed generated path so changing capital or limits replays comparable conditions.
- Starting capital controls maximum quote size; inventory cap limits buy-side exposure.
- The forecast model is trained on separate generated examples and shifts the quote center. Hard inventory and volatility gates override its signal.
- Cash, synthetic fills, fees, marked equity, peak-to-trough drawdown, and pause count are calculated from one ledger.
- A fixed-quote reference uses the same path and starting capital to make the adaptive behavior visible. Neither line is a real-world benchmark.

## States and Boundaries

- **Normal run** — quotes may be posted on either side when cash or inventory is available.
- **Inventory boundary** — buy quotes stop at the configured position cap; sell quotes may still reduce holdings.
- **Shock boundary** — both quotes pause when generated volatility exceeds the stop.
- **No network or account state** — refreshing restores the deterministic default; no personal or financial data is stored.

## Product Decisions

- User direction: MM is a *future* feature, and the demo should explore low-capital operation.
- User direction: avoid personal spending and keep this demo independent of unrelated work.
- Implementation choice: use synthetic data and local execution so this proof of concept is cost-free and does not imply live trading.

## Acceptance Criteria

- A model actually trains on generated examples and its predictions change quote reservation price.
- Simulated inventory never grows through buys beyond the configured capital limit.
- Stress exceeding the volatility stop results in paused quotes.
- All displayed financial outcomes are marked synthetic and reproducible from a seed.
- The app works locally without API keys, payments, or external calls.

## Deferred From the POC

Live order routing, exchange integrations, investor accounts, and real funds. They would change the product, security, and legal scope.

## Non-Goals

No claims of profitability, licensing, production suitability, or similarity to any named market maker's proprietary strategy.

## Open Questions

Whether the synthetic signal would survive realistic fills, fees, venue latency, and adverse selection is unresolved. This need not be answered to demonstrate the simulation loop.
