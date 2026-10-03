## Context
Implement specification sections 3–4, 6–7: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role C; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 2–3 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `ui_core`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/2
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/3

## Scope and implementation notes
- Implement local HTML/CSS/JS against shared fixtures, then wire APIs: overview/three batch cards, registration/details, recent readings, actions and acknowledgment.
- Poll once per second without overlapping requests; retain last known data and timestamps on disconnect, visibly mark disconnected/stale.
- Show field-level validation, empty/loading/errors, quantity/age/assessment time; order actionable warnings first and never coerce unknown maturity.

## Acceptance criteria
- [ ] Main controls are >=44x44 CSS pixels; keyboard/touch work without hover and status uses text/icons.
- [ ] No horizontal scroll at 360 px and demo laptop; synthetic label remains visible.
- [ ] Registration, details, action and ack flows work with fixtures including errors; live wiring verified in integration.

## Required evidence
- 360 px/laptop screenshots, keyboard checklist and fixture flow checks.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
