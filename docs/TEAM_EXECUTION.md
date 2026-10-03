# Team execution guide

## Working together

The team is GeorgeDavidson2 and devfrankduah. Either teammate can pick an unblocked issue and start working. There are no assigned roles, task owners or designated merge owner.

Check dependencies before starting. A brief issue comment or draft PR can signal work in progress and avoid duplicate effort; no assignment step is required. Use focused branches and PRs with `Closes #N` and acceptance evidence. Note shared-contract changes in the PR so dependent work stays compatible.

Native dependency links describe blockers; they do not automatically enforce merge order. Integrate small changes frequently and keep unrelated changes out of each branch.

This two-person workflow supersedes the suggested roles and ownership requirements in sections 5 and 14 of the supplied specification. The original specification remains unchanged as source material; its technical requirements still apply.

## Proposed less-than-24-hour execution

This is a planning allocation, not a delivery promise. The team has two people; exact start/deadline and availability remain unconfirmed. Estimates are focused person-hours and need adjustment to actual progress. Either person can work across modules.

| Relative window | Intended checkpoint |
|---|---|
| Hours 0–2 | Confirm rules; freeze contracts/fixtures; pin scaffold |
| Hours 2–7 | SQLite/simulator/API, features and fixture-driven UI |
| Hours 7–12 | Baseline policy/workflow; independent run dataset; trained/exported tree |
| Hours 12–17 | Local inference/full integration; held-out evaluation; interface evidence |
| Hours 17–21 | Restart/replay/offline/mobile/clean-install verification and fixes |
| Hours 21–23 | Feature freeze, claims gate, backup demo and submission preparation |

Cut P2 first, then P1. Preserve P0 verification. If the critical path slips, surface the failing checkpoint; a threshold-only demo is a milestone, not a compliant final trained-model release. Competition eligibility and permitted work window must be confirmed before presenting work as compliant.

## Dependency outline

Contracts + scaffold → backend storage, features and UI.
Storage → simulator, batch APIs and policy.
Simulator + features → independent dataset → training/export → runtime inference.
Backend + runtime + UI → integrated workflow → reliability and offline/mobile checks.
Frozen model + policy + dataset → held-out evaluation.
Evaluation + reliability + offline/mobile + external decisions → release gate.

GitHub Issues is the work tracker. Each issue contains scope, dependencies, acceptance criteria and required evidence. Optional tasks must not delay the release gate.

## Open decisions

- Competition acceptance, team registration, permitted simulation/prior work, required technology, exact deadline/timezone and submission format.
- Demo laptop and actual LAN/phone arrangement.
- Unspecified contract details recorded in the contracts issue.
- Audio language/reviewer only if the optional task is selected.

Application implementation and competition submission have not been authorized by the repository-planning request alone.
