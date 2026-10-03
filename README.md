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

Requires Python 3.12 (tested with 3.12.14). The pinned numpy has no Python 3.11 build. Node 18 or later runs the JavaScript tests: `for f in tests/test_*.mjs; do node "$f"; done` for the data and model checks (including tree.js parity with scikit-learn), and `node --test tests/*.test.mjs` for the app. `package.json` only marks `.js` files as ES modules for Node 18; it has no dependencies, and there is no build step.

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pytest
```

`web/contract.json` defines the inputs, feature order, encodings, bands and abstention rules for both Python and JavaScript; see [docs/contracts_v2.md](docs/contracts_v2.md). The release issue checks these steps on a clean checkout.

## Data

**Demo location: Bepong, Kwahu South District, Eastern Region, Ghana (6.6034, -0.7121).** Language: Twi. Bepong is named as a coffee-growing area by the Ministry of Food and Agriculture's [Kwahu South district profile](https://mofa.gov.gh/site/directorates/district-directorates/eastern-region/197-kwahu-south) (crops table: "Coffee | Ntomem, Bepong") and by Afrifa, Ofori-Frimpong and Abekoe (2009), West African Journal of Applied Ecology 11, [doi:10.4314/wajae.v11i1.45717](https://doi.org/10.4314/wajae.v11i1.45717), which sampled "Cocobod coffee plantations at ... Bepong". Coordinates are the OpenStreetMap village point; GeoNames (ID 2303145) puts it about 300 m away, inside the same weather grid cell. The decision and its sources are recorded in issue #1.

**Weather.** `web/weather.json` holds daily means of hourly 2 m temperature (T2M) and relative humidity (RH2M) for 2025, built from NASA POWER:

```sh
python -m data.fetch_power --lat 6.6034 --lon -0.7121 --year 2025   # saves data/raw/power_6.6034_-0.7121_2025.csv
python -m data.build_weather --raw data/raw/power_6.6034_-0.7121_2025.csv
```

Request URL: https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=T2M,RH2M&community=AG&longitude=-0.7121&latitude=6.6034&start=20250101&end=20251231&format=CSV&time-standard=LST

Citation, in the wording the POWER project asks for: "The data was obtained from National Aeronautics and Space Administration (NASA) Langley Research Center's Prediction Of Worldwide Energy Resources (POWER) project funded through the NASA Earth Science Division." Service: POWER Hourly API v2.10.2, accessed 3 October 2026. The raw CSV is committed so the build runs offline.

**Synthetic batches.** `python -m data.gen_batches` writes `data/batches.csv` (5,760 batches) and `data/manifest.json` from `data/generator_config.json`, where every parameter names its source (FAO, Codex or ASSUMPTION). There are 60 farms of 80 batches split 36/12/12 by farm, plus 12 stress farms whose checks all fall in September to November, a season the main farms never see. Features are computed by `model/contract.py`, the same encoder the app's JavaScript is tested against. The labels are SYNTHETIC_DEMO: they follow the spec 6 rule, not field measurements. One ASSUMPTION changed from the spec's starting values (the storage time constant, 20 to 120 days); the config records why.

**Model.** `python -m model.train` trains a depth-4 decision tree (class-weighted) on the 36 training farms, picks `abstain_cut` on the 12 validation farms only, and writes `web/tree.json`, the readable rules in [docs/tree_rules.md](docs/tree_rules.md) and the cut search in `evidence/training.json`. Test and stress farms are only read by the evaluation.

## Evidence boundary

Training labels are synthetic, generated from a documented rule tied to FAO and Codex moisture thresholds (evidence mode `SYNTHETIC_DEMO`). Results will show how well the tree recovers that rule. They are not field accuracy, food-safety assessments or income gains.
