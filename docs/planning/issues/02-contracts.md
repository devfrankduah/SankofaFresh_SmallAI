## Context
Implement specification sections 5–8, 10: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1–1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `contracts`

## Dependencies
- None. Either teammate can start.

## Scope and implementation notes
- Implement app/schemas.py and document all /api/v1 request/response contracts, enums, UTC timestamps, schema_version=1 and simulation versus wall time.
- Define batch/reading/prediction/alert/run/action, public state, export and health shapes; keep hidden outcomes out of public schemas. Fix tomato-only immutable metadata and maturity unknown semantics.
- Freeze pure interfaces validate_reading, extract_features, predict, apply_policy and advance_run for consistent use across modules. Supply three-batch, valid, unavailable, invalid and error JSON fixtures.
- Resolve and document unspecified action note/assumptions shape, batch status/reading quality enums, observation alignment, active-run rules, history_known_from semantics and support-status precedence; do not hide decisions in implementations.

## Acceptance criteria
- [ ] Validation rejects non-finite/non-positive quantity, reversed dates, unsupported crops and invalid humidity; unknown maturity remains unknown.
- [ ] Errors consistently contain code/message/field errors; 422/404/409 and mutation ID/version responses have fixtures.
- [ ] Endpoints, feature order and nullable unavailable score/probability are consistent across the shared fixtures.

## Required evidence
- Contract tests and versioned fixtures; reviewed decision notes.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
