## Context
Specification sections 8: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 0.5 to 1 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `scaffold`

## Dependencies
- None. Either teammate can start.

## Scope and implementation notes
- Create the spec 8 layout: data/, model/, tests/, web/ and evidence/.
- Add `requirements.txt` pinning numpy, pandas, scikit-learn, requests and pytest for Python 3.11 or 3.12, and record the tested version.
- Update `.gitignore`. Add a CI workflow that runs pytest and the Node parity test (Node 18 or later) once they exist.
- No frontend framework and no build step.

## Acceptance criteria
- [ ] A clean virtual environment installs `requirements.txt`.
- [ ] CI runs on pull requests without secrets.
- [ ] No frontend framework, bundler or build step is introduced.

## Required evidence
- Clean install log with the exact Python version, and a link to the first CI run.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
