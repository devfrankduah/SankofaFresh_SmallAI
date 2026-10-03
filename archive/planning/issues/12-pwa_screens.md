## Context
Specification sections 3, 4: [docs/SankofaFresh_Spec_v2.md](https://github.com/devfrankduah/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 2 to 3 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `pwa_screens`

## Dependencies
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/2
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/3

## Scope and implementation notes
- Batch list with each batch's last band, the date of the last check and an Add batch button.
- Tap-only check form for the spec 5.1 questions, with "Don't know" on every question and no typing.
- Result screen shell and settings.
- Build against the #2 fixtures so the screens work before the model exists. No external fonts, scripts or CDNs.

## Acceptance criteria
- [ ] AC08: no horizontal scroll at 360 px, tap targets at least 44 by 44 CSS pixels, and status shown with text and an icon, never colour alone.
- [ ] Every spec 5.1 question is answerable by tapping and has a "Don't know" option.
- [ ] All screens render from the #2 fixtures with no model present.

## Required evidence
- 360 px screenshots of each screen and the AC08 checklist.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
