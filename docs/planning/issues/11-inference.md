## Context
Implement specification sections 7–8, 13: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role A; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 0.75–1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `inference`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/10

## Scope and implementation notes
- Implement app/inference.py trusted bundle loading, hash/contract validation and pure local traversal matching scikit-learn precision and <= comparison.
- Abstain outside feature support; output observed factor/model path reason codes without causal claims.
- Measure model bytes and p95 over at least 100 warmed inference calls; record laptop/runtime and application memory separately.

## Acceptance criteria
- [ ] AC06 parity holds on held-out feature vectors and float precision/threshold-boundary cases.
- [ ] Missing/corrupt/incompatible bundle fails explicitly; no network calls or training in runtime.
- [ ] AC13 targets <250 KB and p95 <50 ms are measured and failures reported honestly; unsupported inputs abstain.

## Required evidence
- Parity test results, benchmark command/results and hardware/runtime details.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
