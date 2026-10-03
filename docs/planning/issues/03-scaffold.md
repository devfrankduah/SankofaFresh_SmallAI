## Context
Implement specification sections 2, 5, 12: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 0.75–1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `scaffold`

## Dependencies
- None. Either teammate can start.

## Scope and implementation notes
- Create app/, static/, training/, models/, tests/, data/manifests/ and evidence/ with minimal importable scaffolding.
- Choose and record tested Python 3.11 or 3.12; freeze tested FastAPI/Uvicorn/Pydantic/NumPy/scikit-learn/pytest/httpx versions and a reproducible installation process.
- Configure CI to run meaningful tests as they land; serve local assets and disable remote Swagger assets. Document one-worker localhost startup.

## Acceptance criteria
- [ ] Fresh virtual environment installs pinned dependencies and imports the scaffold.
- [ ] CI runs on pull requests without secrets; no model training at application startup.
- [ ] No CDN/font/script dependencies; local DBs, .venv, secrets and temporary exports are ignored.

## Required evidence
- Clean install log, exact Python version and initial CI run.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
