## Context
Specification sections 5.4: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1.5 to 2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `inference`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/10
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/6

## Scope and implementation notes
- `web/tree.js` interpreter: cast inputs with `Math.fround` and go left when the value is less than or equal to the float32 threshold, as scikit-learn does. Return class probabilities and the decision path.
- `tests/test_parity.mjs`: Node runs tree.js on every held-out row plus threshold boundary cases and must match Python exactly.
- `tests/test_size.py`: tree.json under 250 KB, and a report of total web/ size.

## Acceptance criteria
- [ ] AC04: Python and JS predictions match on all held-out rows, including threshold boundaries.
- [ ] AC05: tree.json is under 250 KB and the total app size is measured and reported.
- [ ] tree.js makes no network calls.

## Required evidence
- Parity test output with row counts, and the size report.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
