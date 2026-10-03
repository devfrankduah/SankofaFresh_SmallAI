## Context
Implement specification sections 6–7, 9: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1.5–2.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `simulator`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/2
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/4

## Scope and implementation notes
- Implement app/simulator.py with separate deterministic noise, batch variation and missingness streams; persist true conditions, observation mask and hidden quality.
- Implement specification toy deterioration formula exactly, daily cycle/bounded noise/heat and clamps; expose only first 72 hours and reserve further 24 for labels.
- Support stable, heat, age variation and missing-sensor configurations; controls create paused/start/pause/resume/step/speed, one server loop and five-minute steps.
- Replay clearly labeled six-hour warm-up through normal ingestion. GETs/browser tabs never advance time; speed only changes wall-clock pacing.

## Acceptance criteria
- [ ] Same seed/config yields identical trajectories; latent outcomes never enter public snapshots.
- [ ] Paused step advances exactly five minutes; invalid transitions return 409 and simultaneous active runs are rejected.
- [ ] Multiple polling clients do not multiply clock speed; restart resumes persisted position.
- [ ] True conditions continue through missing observations; missing values are never replaced with zero.

## Required evidence
- Deterministic golden fixture, clock/control/concurrency and hidden-field exclusion tests.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
