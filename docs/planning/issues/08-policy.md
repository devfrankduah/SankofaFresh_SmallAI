## Context
Implement specification sections 7, 10–11: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role B; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `policy`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/2
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/4

## Scope and implementation notes
- Implement pure apply_policy and persisted counters: initial bands <0.40/0.40..<0.70/>=0.70, three valid updates to escalate and six to downgrade.
- Invalid updates reset candidates, cannot downgrade, and overlay unavailable while preserving unresolved warning timestamps.
- Emit severity changes and deduplicated same-severity reminders after 60 simulated minutes; higher severity overrides cooldown. Persist message IDs/state/timestamps.
- Implement configurable sustained-temperature baseline using the same alert timing logic; SMS preview, if exposed, is SIMULATED_NOT_SENT.

## Acceptance criteria
- [ ] Threshold equality, consecutive counters, invalid interruptions, escalation during cooldown and reminders are tested.
- [ ] Acknowledgment does not reset risk/remind; unavailable data does not end an alert episode.
- [ ] Reopened policy state does not duplicate emissions at a repeated step.

## Required evidence
- Table-driven transition tests, baseline fixture and persistence integration tests.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
