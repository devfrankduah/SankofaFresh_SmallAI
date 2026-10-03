## Context
Implement specification sections 2, 5, 12: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role D; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 0.75–1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `scaffold`

## Dependencies
- None. Ready for a teammate to claim.

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

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
