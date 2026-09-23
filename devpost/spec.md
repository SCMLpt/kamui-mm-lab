---
doc: spec
status: draft
---
# Kamui MM Lab — Technical Spec

## How This Works, In Plain Language

The app invents a short market path, trains a tiny model on different invented examples, and uses its signal to move bids and asks. A separate set of hard rules limits inventory and stops quotes during shocks. A ledger marks cash plus holdings to each invented price. Because the app is local and dependency-free, a judge can replay it without accounts, credits, or a server service.

## The Core Journey Through the System

The visitor adjusts HTML controls → `app.js` passes the selected settings to `runSimulation` → `engine.js` generates a fixed path, trains the model, makes quotes, simulates fills, and returns metrics → `app.js` renders cards, chart, and events. A changed control reuses the path seed for a fair before/after inspection.

## Stack

Node.js 18+ with native HTTP server and browser-native ES modules; no runtime libraries. This is an implementation choice for a small, free, reproducible proof of concept.

## Components

- `engine.js`: seeded path generator, linear model training, inventory-aware quote construction, and cash/inventory ledger.
- `app.js`: controls, render, SVG chart, and event log.
- `index.html` and `styles.css`: local demo UI.
- `server.js`: dependency-free static server.

## Look and Feel

Dark, compact panels; lime for the active strategy, gray for the reference, amber for risk stops. Native system fonts prevent third-party font requests. Copy uses "synthetic" and "simulation" near all results.

## Data Model

Each generated tick has mid-price, book imbalance, momentum, volatility, aggressor side, and aggression. The training path and demo paths use distinct seeds. A simulation result includes states, marks, fills, pause reasons, and metrics.

## File Structure

```text
kamui-risk-desk/
├── index.html, styles.css, app.js  # browser interface
├── engine.js, engine.test.js       # deterministic model and simulator
├── server.js, package.json         # local server and test commands
├── README.md                        # setup and limits
├── skills-lock.json                 # Devpost Learn Skill Pack source
└── devpost/                         # planning documents
```

## External Services

None. No key or user data is required.

## What Was Simplified and Why

Generated aggression replaces a venue matching engine, a small linear forecast replaces a cloud model, and spot-like cash/inventory accounting replaces leveraged derivatives. These choices let the capital and stop logic be inspected without real funds or compute bills.

## Decisions and Open Issues

The low-capital MM direction and cost boundary came from the user. The simulator, fixed seeds, model form, and browser stack are implementation choices. The key open issue is external validity: realistic venue data, latency, fee schedules, queue position, and capital needs remain untested.

## Failure Modes

Input bounds are clamped. Missing browser canvas or JS shows a static explanation. An unavailable port can be changed with `PORT=... npm start`. Numerical outputs are for hypothetical synthetic paths only.

## Where It Runs and How Someone Tries It

Run `npm start` with Node.js 18+ and visit `http://127.0.0.1:4174/`. Run `npm test` to verify the engine's key risk gates.
