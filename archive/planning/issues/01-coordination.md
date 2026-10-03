## Context
Specification sections 13: [docs/SankofaFresh_Spec_v2.md](https://github.com/devfrankduah/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 0.5 to 1 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `coordination`

## Dependencies
- None. Either teammate can start.

## Scope and implementation notes
- Confirm in the Hack-Nation workspace: the exact deadline and timezone, the submission form fields, and whether the form wants one video or three.
- Choose the local language and the demo location together so they match: a language the team can verify tonight, spoken in a coffee-growing location. Check the coordinates on a map before weather is fetched.
- Decide repository visibility for judges and the static host. Static hosting from a private repository may need a paid plan, so use a public repository or a separate static host.
- Record the prior concept disclosure: SankofaFresh existed as an idea before the event, and all code is written during the event window.

## Acceptance criteria
- [ ] Each answer is recorded in this issue with its source and time, or marked unresolved.
- [ ] Language and demo location are decided by the 14:30 ET checkpoint, with the checked coordinates recorded.
- [ ] No organizer approval is claimed that was not given.

## Required evidence
- An issue comment listing each decision with its source (link or screenshot) and time, and any unresolved items.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
