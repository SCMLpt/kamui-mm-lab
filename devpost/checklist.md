---
status: draft
mode: fast
---
# Build checklist

## Slices

- [ ] **1. Capital-limited synthetic quoting**
  - Becomes usable: A visitor can run a deterministic synthetic market and see quote, fill, and equity results.
  - Why now: This is the unique MM kernel.
  - PRD ref: Core Journey; Acceptance Criteria.
  - Spec ref: Components; Data Model.
  - Build: Market generator, model, quoting ledger, and initial UI.
  - Verify (mechanical): `npm test` and run the page.
  - Learner check: Lower starting capital and confirm fills or quote capacity change.
  - Commit: Local source checkpoint only if requested.
- [ ] **2. Visible stress controls and demo story**
  - Becomes usable: A visitor can compare calm, trend, and shock paths and see risk pauses.
  - Why now: A capital-light claim needs visible failure controls.
  - PRD ref: Core Journey; Acceptance Criteria.
  - Spec ref: Failure Modes.
  - Build: Stress states, comparison chart, clear limitations, and demo capture.
  - Verify (mechanical): Engine tests, browser interaction, and review of exported video.
  - Learner check: Select shock and see paused-quote count rise.
  - Commit: Local source checkpoint only if requested.

## Hands-on Checkpoints

- [ ] User can try the core journey.

## Final Review

- [ ] Browser and video checked for accurate synthetic-only labeling.

## Code Tour and App Map

- [ ] Paths and run steps documented in README.

## Revisions
