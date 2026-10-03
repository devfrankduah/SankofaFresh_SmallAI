## Context
Specification sections 5.2, 10: [docs/SankofaFresh_Spec_v2.md](https://github.com/devfrankduah/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1 to 1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `weather`

## Dependencies
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/3

## Scope and implementation notes
- `data/fetch_power.py`: NASA POWER hourly T2M and RH2M, community AG, with `--lat --lon --year`. Coordinates come from #1; the script must not hard-code them.
- `data/build_weather.py` writes `web/weather.json` with daily means and the 14-day features from spec 5.2 (rh14_mean, rh14_max, t14_mean).
- Record the request URL and the POWER citation in the README.

## Acceptance criteria
- [ ] `web/weather.json` is under 100 KB.
- [ ] Values fall in plausible ranges (RH2M within 0 to 100 percent, T2M plausible for the location).
- [ ] Coordinates and year come only from the command-line arguments.

## Required evidence
- The fetch command and request URL, the weather.json size, and a summary of value ranges.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
