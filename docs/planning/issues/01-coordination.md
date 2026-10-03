## Context
Implement specification sections 14, 16: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 0.5–1 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `coordination`

## Dependencies
- None. Either teammate can start.

## Scope and implementation notes
- Obtain the complete competition brief, participant acceptance, registered team, permitted work window, exact deadline and timezone, technology requirements, and simulation/prior-work rules.
- Record prior SankofaFresh concept disclosure and distinguish pre-existing material from work created during the permitted window.
- Confirm the demo laptop and network needed for local and offline verification.

## Acceptance criteria
- [ ] Record each external answer with source/date or explicitly mark unresolved; do not claim organizer approval.
- [ ] Record laptop OS/Python and intended LAN test arrangement.
- [ ] Resolve competition eligibility before final submission.

## Required evidence
- Linked organizer evidence and demo environment details; unresolved external decisions clearly listed.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
