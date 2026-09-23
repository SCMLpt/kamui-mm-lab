---
doc: scope
status: draft
---
# Kamui MM Lab

One line: A local simulator that explores market making with a small balance sheet and visible risk limits.

## The Unique Kernel

Show whether a small starting budget can support two-sided quotes while automatically reducing exposure when inventory or volatility rises. A model learns a directional signal from generated examples, but risk limits remain deterministic and visible.

## Who It's For

A founder exploring a possible future market-making feature for Kamui. They need to demonstrate a credible technical direction before seeking outside support, without committing real funds to experiments.

## The Core Loop

Set a small starting budget and position cap, choose a generated market regime, run it, inspect quotes and capital use, then change one constraint and replay the same path.

## Inspiration & Identity

The user named Wintermute as an ambition for market making, without suggesting an affiliation or shared technology. The visual direction is Kamui's restrained dark interface with sharp typography and lime signal color. The demo should read as research, not a live fund dashboard.

## Why This Matters to the Learner

The founder wants to pursue a market-making innovation that does not depend on a large starting treasury. This demo uses no personal spending or institutional resources.

## What "Working" Looks Like

Starting with $250 of synthetic capital and a 20% inventory cap, a visitor can replay a generated shock, see the live-looking bid/ask logic, and watch the volatility rule pause quotes. The result is a bounded ledger and chart, not a return promise.

## The POC Boundary

One browser page, one synthetic asset, three generated market regimes, a capital slider, risk controls, deterministic replay, and an explicit fixed-quote comparison. Everything runs locally without credentials or network data.

## Later

If the research direction proves useful: venue-specific quote simulation, realistic execution costs, independent risk review, and only then consideration of live systems. Those require separate resources and decisions.

## Explicitly Cut

Live exchange connections, real assets, investor deposits, production execution, claims of profitability, and regulatory status. Also cut hosted backend and account creation.
