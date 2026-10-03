## Context
Specification sections 4, 9: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1 to 1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `deploy_offline`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/14

## Scope and implementation notes
- Service worker pre-caches every file the app needs.
- Deploy to the static host chosen in #1.
- Open the app once online, switch to airplane mode, reload and run a check. Record it.
- Fill `evidence/offline-check.md` and save the browser network log.

## Acceptance criteria
- [ ] AC06: after one online load, the app works in airplane mode on a real phone, including a reload.
- [ ] AC07: no network requests at runtime after install.
- [ ] Done by the 23:00 ET checkpoint.

## Required evidence
- Screen recording, evidence/offline-check.md, the network log and the deployed URL.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
