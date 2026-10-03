# SankofaFresh Small AI

An offline phone web app (PWA) that helps a smallholder coffee farmer decide what to do with stored coffee parchment before selling it: keep it, re-dry it, move it off the floor, or take a sample to the cooperative's moisture meter first. A small decision tree runs inside the browser. It combines tap-only answers about each batch with bundled local humidity data and returns one of four results (green, amber, red, not sure), each a fixed, human-checked message in a named local language.

**Status: scaffold and shared contracts only. The app itself isn't built yet, and nothing has been verified on a phone.**

Hack-Nation 7th Global AI Hackathon, Challenge 04, Small AI for Development, Agriculture sector.

- [Specification v2](docs/SankofaFresh_Spec_v2.md), the source of truth for the product
- [Team execution guide](docs/TEAM_EXECUTION.md)
- [Acceptance evidence register](docs/ACCEPTANCE.md)
- [GitHub issues](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues) and the [issue index with dependencies](docs/planning/ISSUE_INDEX.md)
- [v1 to v2 issue migration map](docs/planning/V2_ISSUE_MAP.md)
- [Specification v1](docs/SankofaFresh_Project_Specification.md), superseded and kept as history

## Planned stack

- Static PWA: HTML, CSS, vanilla JavaScript, a service worker and a web manifest. No frontend framework and no build step.
- A scikit-learn decision tree (max depth 4), trained offline by the team in Python, exported to a JSON file of a few KB and run in the browser by a small JavaScript interpreter.
- NASA POWER hourly humidity and temperature for one demo location, bundled with the app.
- Records stay in the browser's localStorage. No accounts, names, phone numbers or location.
- The app drafts an SMS the user can choose to send from their own phone. It never sends anything itself.

After one online load, checks and results are meant to work in airplane mode. The whole app targets under 1 MB, to be measured and reported.

## Start here

Either teammate, GeorgeDavidson2 or devfrankduah, can pick any unblocked issue and start. Begin with [#1](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/1) (deadline, language and demo location), [#2](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/2) (contracts) and [#3](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/3) (scaffold). Open focused PRs with evidence.

## Development setup

Requires Python 3.12 (tested with 3.12.14). The pinned numpy has no Python 3.11 build. Node 18 or later runs the JavaScript tests (`node tests/test_encode_parity.mjs`). `package.json` only marks `.js` files as ES modules for Node 18; it has no dependencies, and there is no build step.

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pytest
```

`web/contract.json` defines the inputs, feature order, encodings, bands and abstention rules for both Python and JavaScript; see [docs/contracts_v2.md](docs/contracts_v2.md). The release issue checks these steps on a clean checkout.

## Evidence boundary

Training labels are synthetic, generated from a documented rule tied to FAO and Codex moisture thresholds (evidence mode `SYNTHETIC_DEMO`). Results will show how well the tree recovers that rule. They are not field accuracy, food-safety assessments or income gains.
