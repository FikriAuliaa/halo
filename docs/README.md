# Documentation Index

Which document answers which question.

| Question                                                                | Document                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------- |
| What is this system and why does it exist?                              | [`../README.md`](../README.md), [`../PRD.md`](../PRD.md) |
| What are the exact product requirements and acceptance criteria?        | [`../PRD.md`](../PRD.md)                                 |
| What does the UI look like, and what tokens/components implement it?    | [`../DESIGN.md`](../DESIGN.md)                           |
| What are the rules for a coding agent working in this repo?             | [`../AGENTS.md`](../AGENTS.md)                           |
| How is the system structured, and what do the critical flows look like? | [`../ARCHITECTURE.md`](../ARCHITECTURE.md)               |
| What are the Firestore/Storage collections, fields, and invariants?     | [`../DATA_MODEL.md`](../DATA_MODEL.md)                   |
| What is the contract for each trusted server operation?                 | [`../API_SPEC.md`](../API_SPEC.md)                       |
| What are the threats and controls?                                      | [`../SECURITY.md`](../SECURITY.md)                       |
| What's the testing strategy and scenario catalogue?                     | [`../TEST_PLAN.md`](../TEST_PLAN.md)                     |
| How do we deploy, and what are the environment variables?               | [`../DEPLOYMENT.md`](../DEPLOYMENT.md)                   |
| What's the daily operational routine?                                   | [`../OPERATIONS.md`](../OPERATIONS.md)                   |
| Something is broken in production — what do I do?                       | [`../RUNBOOK.md`](../RUNBOOK.md)                         |
| Why was a specific hard-to-reverse decision made?                       | [`adr/`](adr/)                                           |
| Why was a specific easy-to-reverse decision made?                       | [`../PROJECT_DECISIONS.md`](../PROJECT_DECISIONS.md)     |
| What did the discovery phase find before any code was written?          | [`reports/`](reports/)                                   |

## ADR vs. `PROJECT_DECISIONS.md`

A decision gets a full ADR (`docs/adr/NNN-*.md`, using the [template](adr/000-template.md)) when reversing it later would mean a data migration, a rewritten security boundary, or a changed public contract (API shape, status lifecycle, tracking mechanism). Everything else — defaults, seed values, UI behaviour that doesn't touch the data model — goes in `PROJECT_DECISIONS.md` as a one-line dated entry.

## Reports

`docs/reports/` holds point-in-time discovery output (audits, the requirement register, the contradiction register, the seed reconciliation). These are not living documents — they describe what was true when Phase 0 ran. The living documents are the ones listed in the table above.
