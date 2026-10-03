# SankofaFresh Small AI

Planning repository for a local, phone-friendly tomato storage demonstration. **Status: specification and backlog only; application not implemented or verified.**

The target stack is local HTML/CSS/JavaScript, Python FastAPI (one worker), SQLite and a trained compact decision tree. Runtime inference must not require internet. Default evidence mode is `SYNTHETIC_DEMO`; synthetic risk scores are not real-world probabilities, food-safety assessments or measured farm-loss reductions.

- [Supplied technical specification](docs/SankofaFresh_Project_Specification.md)
- [Team execution guide](docs/TEAM_EXECUTION.md)
- [Acceptance evidence register](docs/ACCEPTANCE.md)
- [GitHub issues](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues)
- [Issue index and dependencies](docs/planning/ISSUE_INDEX.md)

## Start here

Either teammate, GeorgeDavidson2 or devfrankduah, can pick any unblocked issue and start. No assigned roles or task owners are required. Begin with contracts and scaffold; use shared fixtures to develop backend, model and interface work in parallel. Open focused PRs with evidence.

Setup commands in the specification are **planned**, not working instructions yet. The scaffold and clean-install issues must supply and verify them. No application tests have run at this planning stage.

Minimum scope: tomatoes, three batches, one virtual storage zone, seeded simulated readings, trained local model, persisted alerts, operator actions and labeled held-out evaluation. Optional audio and a stronger baseline follow P0. Financial scenarios and intervention branches are deferred.

Localhost is the default runtime binding. Controlled phone access requires the laptop and phone on a tested LAN. This unauthenticated prototype must not be exposed publicly. The private repository does not itself provide runtime authentication.
