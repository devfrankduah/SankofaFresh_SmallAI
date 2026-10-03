## Context
Implement specification sections 4, 12, 14: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P1
- Planning estimate: 0.5–1 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `audio`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/13

## Scope and implementation notes
- Confirm language and reviewer; obtain reviewed recordings with permission and bundle locally.
- Require user sound opt-in and keep text visible; no online speech service.

## Acceptance criteria
- [ ] Reviewed transcript matches message meaning and correct state.
- [ ] Audio works after offline reload and disabled sound preserves full text.

## Required evidence
- Reviewer/language record and offline playback check.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
