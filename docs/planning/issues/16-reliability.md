## Context
Implement specification sections 6–10, 13: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `reliability`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/14

## Scope and implementation notes
- Run AC02 identical seed/config/model replay and compare readings/predictions/alerts excluding separately documented wall-clock-only fields.
- Run AC03 future-reading perturbation, AC04 missing-sensor/fresh-score checks, AC05 real process restart at saved position and near cooldown/candidate transition boundaries.
- Verify non-monotonic/duplicate ingestion, atomic rollback, resumed run and no duplicate alerts.

## Acceptance criteria
- [ ] AC02–AC05 have repeatable tests, commands and recorded results.
- [ ] Restart preserves original warnings, counters, acknowledgment and trajectory position.
- [ ] Failures remain open and block release; no acceptance box checked without evidence.

## Required evidence
- Test logs and replay/restart output comparisons tied to commit/model/config.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
