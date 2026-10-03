## Context
Specification sections 1, 7, 11: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 2 to 3 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `video`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/14
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/15

## Scope and implementation notes
- Script and record one 2 to 5 minute video covering the five required parts: the problem sentence; the AI and why a simpler tool would not do the same job, with its guardrails; the demo (airplane mode, the three demo batches, the not_sure moment and the SMS draft); where it sits in the user's week, plus the tech stack; and the team's take on localizing AI.
- Export short cuts if the submission form asks for more than one video.
- Rough cut by the 05:00 ET checkpoint.

## Acceptance criteria
- [ ] The video runs 2 to 5 minutes and covers all five required parts.
- [ ] The demo shows airplane mode, the three demo batches, a not_sure result and the SMS draft.
- [ ] It states the data limits from spec 10, labels metrics as synthetic, and makes no claim that spec 12 rules out.

## Required evidence
- The exported video file or link, the script, and timestamps for each of the five parts.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
