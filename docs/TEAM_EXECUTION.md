# Team execution guide

## Owners and collaboration

| Role | Responsibility | Named teammate |
|---|---|---|
| A | Data, features, model, evaluation | Unconfirmed |
| B | Backend, SQLite, simulator, policy | Unconfirmed |
| C | Interface and accessibility | Unconfirmed |
| D | Integration, evidence, submission | Unconfirmed |
| Merge owner | Review sequencing and integration | Unconfirmed |

For two teammates combine A+B and C+D. Do not assign or invite guessed GitHub identities. A private repository needs confirmed collaborator access before teammates can work.

One owner claims each issue. Use focused branches and PRs, state `Closes #N`, and attach acceptance evidence. A dependency link records a blocker; it does not automatically enforce merge order. Integrate small PRs frequently through the merge owner. Use issue discussions and PRs for contract changes and handoffs.

Shared files `app/main.py`, `app/schemas.py`, `app/storage.py` and dependency files need one editing owner at a time. Interface work begins with contract fixtures; backend/model owners preserve the agreed pure interfaces. Resolve contract changes before dependent PRs merge. Keep unrelated changes out of task branches.

## Proposed less-than-24-hour execution

This is a planning allocation, not a delivery promise. Exact start/deadline, team size and availability are unknown. Estimates are focused person-hours and require team calibration. Roles have uneven workloads, especially backend; the merge owner should move completed small tasks to available teammates while retaining module review.

| Relative window | Intended checkpoint |
|---|---|
| Hours 0–2 | Confirm rules/owners; freeze contracts/fixtures; pin scaffold |
| Hours 2–7 | SQLite/simulator/API, features and fixture-driven UI in parallel |
| Hours 7–12 | Baseline policy/workflow; independent run dataset; trained/exported tree |
| Hours 12–17 | Local inference/full integration; held-out evaluation; interface evidence |
| Hours 17–21 | Restart/replay/offline/mobile/clean-install verification and fixes |
| Hours 21–23 | Feature freeze, claims gate, backup demo and submission preparation |

Cut P2 first, then P1. Preserve P0 verification. If the critical path slips, surface the failing checkpoint immediately; a threshold-only demo is a milestone, not a compliant final trained-model release. Competition eligibility and permitted work window must be confirmed before presenting work as compliant.

## Dependency outline

Contracts + scaffold → parallel backend storage, features and UI.
Storage → simulator, batch APIs and policy.
Simulator + features → independent dataset → training/export → runtime inference.
Backend + runtime + UI → integrated workflow → reliability and offline/mobile checks.
Frozen model + policy + dataset → held-out evaluation.
Evaluation + reliability + offline/mobile + external decisions → release gate.

Native issue dependencies and linked issue bodies are the executable backlog. GitHub Issues is the work tracker; no project board is required. Optional tasks must not delay the release gate.

## Open decisions

- Competition acceptance, team registration, permitted simulation/prior work, required technology, exact deadline/timezone and submission format.
- Named owners, merge owner and GitHub handles/access.
- Demo laptop and actual LAN/phone arrangement.
- Unspecified contract details recorded in the contracts issue.
- Audio language/reviewer only if the optional task is selected.

Keep the supplied specification unchanged as source material. Its embedded handoff language is source context; the user authorized repository and issue preparation, not application implementation or competition submission.
