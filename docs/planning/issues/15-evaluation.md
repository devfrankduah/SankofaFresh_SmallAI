## Context
Implement specification sections 8, 11, 13: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role A; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `evaluation`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/11
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/8
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/9

## Scope and implementation notes
- Evaluate frozen AI and validation-tuned baseline on identical observed histories, eligible opportunities and policy timing.
- Report confusion counts separately from event warnings. Qualifying warning is amber/red transition within 24 hours before event; lead time uses first qualifying transition.
- Count false episodes with no event in 24 hours after onset, excluding censored onsets; episodes end only after valid green downgrade, not unavailable data.
- Export versioned machine-readable and readable results, independent run/event counts, misses, lead times, false episodes per monitored batch-day, coverage and stress-test results. Document denominator definitions.

## Acceptance criteria
- [ ] AC11 same-history/policy comparison is reproducible and test set has not been used for tuning.
- [ ] Metric fixtures verify window boundaries, censoring, repeated alerts, unavailable gaps and denominator handling.
- [ ] Missing metrics are null/Not evaluated; zero-event cases do not divide by zero or imply success.
- [ ] Report weaker AI results if observed and describe correlated windows/few-event limitations.

## Required evidence
- Frozen artifact hashes, held-out report/export, metric tests and reproducible command.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
