# Procurement Harness v0 Run Log

## 2026-05-26 13:53 PDT

Created local v0 artifact after the AgentMail challenge asked for proof that a `$500 browser-use procurement agent plan` could be shipped quickly.

## Dry-Run Cases

| Case | Result | Reason |
| --- | --- | --- |
| `examples/allowed.json` | approval_required | Merchant, category, and budget pass; human approval still required. |
| `examples/over-budget.json` | rejected | Candidate price exceeds budget. |
| `examples/prohibited-category.json` | rejected | Candidate category is cash-equivalent. |

## Next Step

Added `run.js`, a local validator that evaluates all example cases and writes generated audit packets to `out/`.

## 2026-05-26 13:58 PDT

Extended the harness toward the v1 design:

- normalized event logs per run
- event-derived audit packet hash
- checkout-total checks
- regression cases for hidden fees, merchant mismatch, and price drift
