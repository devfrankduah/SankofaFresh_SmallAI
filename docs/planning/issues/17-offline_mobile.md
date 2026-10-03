## Context
Implement specification sections 2, 4, 12–13: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role D; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `offline_mobile`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/14
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/3

## Scope and implementation notes
- Verify internet-disabled process restart and browser reload, local inference and assets; bundled audio only if included.
- Test 360 px/laptop width, touch/keyboard, text/icons, disconnected timestamps, validation/loading/empty states.
- Have a teammate launch from README in a fresh environment; record exact commands/version and dependency installation versus offline runtime boundary.
- If claiming phone operation, test actual phone on actual demo LAN with explicit 0.0.0.0 binding; document localhost default, laptop dependency and no public exposure.

## Acceptance criteria
- [ ] AC08, AC09, AC14 have direct observed evidence, not only unit tests.
- [ ] AC10 passes on actual hardware/network or phone operation is explicitly unclaimed; do not invent successful device tests.
- [ ] README commands work from clean checkout; no external fonts/scripts/Swagger assets are requested.

## Required evidence
- Offline recording, clean-install log, browser/network inspection and actual device checklist when applicable.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
