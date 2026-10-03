## Context
Specification sections 3, 11: [docs/SankofaFresh_Spec_v2.md](https://github.com/devfrankduah/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1 to 1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `device_records`

## Dependencies
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/2
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/3

## Scope and implementation notes
- localStorage wrapper for batches and recorded actions, with every read and write wrapped in try/catch so the app still runs when storage is blocked or empty.
- Consent screen on first run, in the local language: records stay on the phone, and nothing is sent unless the user sends the SMS themselves.
- Delete all records from settings.
- Store only the spec 5.1 inputs, results and recorded actions. No accounts, names, phone numbers or GPS.
- Recording an action (re-dried, moved off the floor, took a sample, sold, other) does not change the result.

## Acceptance criteria
- [ ] AC11: records stay on the device, the consent screen shows on first run, and delete clears everything.
- [ ] When localStorage throws, the app still loads and runs a check instead of failing.
- [ ] Saving or deleting records makes no network request.

## Required evidence
- Manual check notes with screenshots: consent on first run, a saved batch after reload, and an empty list after delete-all.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
