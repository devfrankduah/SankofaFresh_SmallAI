## Context
Implement specification sections 13–16: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `release`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/1
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/15
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/16
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/17

## Scope and implementation notes
- Map all AC01–AC14 to evidence; verify model parity/performance and registration evidence alongside integration checks.
- Review every UI/readme/demo claim: SYNTHETIC_DEMO, probability null, no farm-loss/food-safety/solar/real-SMS/microcontroller claims.
- Freeze features and record backup demo covering registration, heat replay, trained model, operator alert, internet disconnect, missing sensor and baseline results.
- Use confirmed organizer format/deadline and prior-work disclosure for submission pack; obtain any required human submission action.

## Acceptance criteria
- [ ] All required release checks have links/results; failed checks are explicit blockers, not silently waived.
- [ ] Trained local model and full workflow are present; threshold-only integration is not labeled final.
- [ ] Submission pack follows verified brief and recording length; eligibility/deadline unknowns remain blockers until resolved.

## Required evidence
- Signed-off acceptance matrix, commit/model hashes, backup recording and final claims checklist.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
