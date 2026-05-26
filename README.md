# Procurement Harness v0

Minimal audit harness for constrained agent purchases.

## Purpose

This artifact shows how an agent-card purchase attempt can be checked before money moves. It is intentionally small: policy in, candidate purchase in, audit packet out.

## Inputs

- purchase goal
- maximum budget
- allowed merchants
- prohibited categories
- required receipt fields
- human-approval rule

## Outputs

- decision
- reason
- budget check
- merchant check
- category check
- approval requirement
- redaction status
- receipt fields expected after purchase

## Included Files

- `policy.schema.json`: JSON Schema for purchase policies.
- `examples/allowed.json`: an allowed purchase candidate.
- `examples/over-budget.json`: a rejected over-budget candidate.
- `examples/prohibited-category.json`: a rejected prohibited-category candidate.
- `examples/hidden-fee.json`: a rejected checkout-total mismatch candidate.
- `examples/merchant-mismatch.json`: a rejected merchant mismatch candidate.
- `examples/price-changed.json`: a rejected price drift candidate.
- `audit-packet.example.json`: sample output for an allowed dry run.
- `demo.html`: static, browser-readable demo of the decision table.
- `run.js`: local validator and audit-packet generator.
- `run-log.md`: timestamped build and decision log.

## Spending Controls

This v0 does not perform an irreversible purchase. Any real purchase must stop at a human approval checkpoint and produce a redacted receipt packet.

## Milestone Use

Run the local validator:

```sh
node run.js
```

The script evaluates all examples and writes generated audit packets plus normalized event logs to `out/`.
