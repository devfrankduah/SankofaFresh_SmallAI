# SankofaFresh

**An offline phone app that helps a smallholder coffee farmer decide which stored batch to check before a buyer arrives.**

SankofaFresh runs in the web browser of the phone a household already has, and keeps working in airplane mode after one online visit. The farmer picks a stored batch of coffee parchment and taps answers to six questions about it: how long it dried, whether it got wet, whether the bags sit on the floor, whether it smells musty, what their hand or bite test says, and the day it was bagged. A small decision tree inside the phone combines those answers with local humidity for the same weeks and shows one of four results: **green** (no warning signs), **amber** (check this batch soon), **red** (check it before selling and take a sample to the cooperative) or **not sure** (ask a person at the cooperative). Every word on screen comes from a fixed, human-written message file; nothing is generated. The app never sends anything. It drafts an SMS the farmer can choose to send from their own phone.

Hack-Nation 7th Global AI Hackathon, Challenge 04, Small AI for Development, agriculture.

**Live app:** [https://devfrankduah.github.io/SankofaFresh_SmallAI/](https://devfrankduah.github.io/SankofaFresh_SmallAI/) (English and Twi; works offline after the first visit). It deploys from `main` through `.github/workflows/pages.yml`.

**Status:** the app works offline end to end with a trained model. Every result below is on synthetic labels, and the app has not been tested with farmers.

## The problem

**Because of this tool, a coffee farmer with no moisture meter can find out, on the household phone and with no connection, which stored batch to dry again, move off the floor or take to the cooperative's meter before selling it. We know this is needed because:**

- Farmers rarely own the instrument: "Few farmers have moisture meters, used to make rapid determinations of moisture content, but they are more common amongst traders." (FAO, *Guidelines for the Prevention of Mould Formation in Coffee*, 2006, p. 21)
- Moisture decides whether stored coffee stays safe. FAO gives "the recommended maximum acceptable moisture content (12 and 13% (wb) for dry parchment and cherry coffee)" (p. 17), and the Codex code of practice says "moisture content < 12.5% (wet basis) is sufficient for protecting parchment coffee from damage by fungi" (CAC/RCP 69-2009, p. 10).
- Storage weather moves it: "if the air is more humid than the coffee (a relative humidity of more than about 80%) the coffee will begin to absorb water." (FAO 2006, p. 20)
- Buyers pay less for wet coffee. In Uganda, exporters require moisture "under 12 per cent", and traders can face "a 10 per cent discount if the moisture level is above 12 per cent". (ILO, *Mapping the coffee value chain in Uganda*, 2024, pp. 15 and 32, citing Nalunga 2021)
- Farmers sell at an information disadvantage: "The resulting information asymmetry between producer and the buyer may lead to perverse outcomes for agrarian households." (Arslan, Gregg and Wollni, *American Journal of Agricultural Economics* 106(1), 2024; published online 2023)
- The World Bank describes small AI as "practical, affordable solutions that run on everyday devices" (*Small AI, Big Impact*, 2026).
- In Ghana, coffee is "the main source of income for over 8,000 households of small-scale farmers" (ICO and COCOBOD, *Country Coffee Profile: Ghana*, 2018, p. 7), and drying is "a very critical stage in determining the final quality of coffee" (p. 20).

This evidence is for the problem, not for our tool: we have not measured any effect on losses or income. Most of it comes from FAO and Codex guidance and from Uganda; the Ghana facts come from the ICO profile produced with COCOBOD, and our demo location is in Ghana (see [Data](#data)).

## How it works

1. **Seven tap-only steps.** One screen each, no typing: the batch, then six questions, each with "Don't know". A re-check skips the batch step. The model takes eight inputs, listed with their allowed answers in `web/contract.json`; the app works out the eighth, days stored, from the bagging date to today. It refuses a bagging date after today, and a date more than 180 days back gives not sure.
2. **Local weather.** The app carries NASA POWER daily humidity and temperature for 2025 at the demo location. For each batch it takes the 14 days ending on the check date (the bagging date plus days stored, which is today for a new check) and computes average humidity, peak daily humidity and average temperature.
3. **The tree.** A decision tree six levels deep, trained offline in Python (scikit-learn) on synthetic batches, exported as a 12 KB JSON file and run in the browser. The app checks the file's SHA-256 hash before using it. Python and the browser give identical answers on all 2,880 held-out batches and 228 threshold edge cases (`tests/test_parity.mjs`).
4. **Four results.** Green, amber, red or not sure. Not sure appears when an answer is "Don't know", when an answer is outside what the tree saw in training, or when the tree's top probability is below a cut chosen on validation farms.
5. **Fixed messages.** Each result shows its band message, up to two reasons from the tree's decision path (for example "The bags are on the floor."), and one action: dry it again, move the bags onto a pallet or rack, or take a sample to the cooperative's moisture meter. English and Twi ship; switch language in Settings. Of the 96 Twi strings, 93 were machine-drafted and then checked line by line by a fluent Twi speaker on the team. The other 3 have not been checked by a speaker: 2 screen-reader strings for the weather pictures (`weather_days`, `weather_strip`), drafted from published sources (a Twi dictionary, a Twi course and a Twi Bible), and the machine-drafted note under those pictures (`weather_note`). Unreviewed drafts (`*.draft.json`) are never shipped or cached.
6. **SMS draft.** Amber, red and not sure results show a short message to the cooperative, labelled "Not sent. You decide whether to send it.", with a copy button. The app has no way to send it.
7. **Records stay on the phone.** Batches live in the browser's local storage. There is no account, name, phone number or location, and Settings has a one-tap delete with a confirmation.

## Try it

**Offline test on a phone:** open [the live app](https://devfrankduah.github.io/SankofaFresh_SmallAI/) once with a connection and let it load. Turn on airplane mode, then reload the page. Open Settings, tap "Load demo batches" and open each batch. Results, reasons, the SMS draft and the evidence screen ("About this check") all work with no connection. Our own check so far was in a desktop browser with the server stopped ([evidence/offline-check.md](evidence/offline-check.md)); the real-phone check is still to do ([#17](https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/17)).

**The three demo batches** ([evidence/demo_batches.json](evidence/demo_batches.json), loaded by the Settings button):

| Batch | Answers | Tree | Humidity-only rule |
|---|---|---|---|
| Clearly safe | dried 12 days, not rewetted, raised, not musty, hand test dry, stored 20 days from 1 March 2025 | green | green |
| Rewetted in dry weeks | dried 8 days, rained on, raised, not musty, hand test damp, stored 10 days from 15 January 2025 | amber | green |
| Missing answer | as the first, but hand test "Don't know" | not sure | (no answer) |

**On a computer:** the app is the static folder `web/`, with nothing to build or install.

```sh
cd web
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/. The first load stores every file in `web/` for offline use, except unreviewed drafts (`*.draft.json`), which are never cached or loaded. Use https, or `localhost` or `127.0.0.1` on the same machine: plain http on a LAN address is not a secure context, so the browser runs no service worker and no Web Crypto, and the app refuses the model because it can't check its hash. To preview the screens with the shared test fixtures, serve the repository root instead and open http://127.0.0.1:8000/web/index.html?fixtures.

## Run and reproduce

Python 3.12 (tested with 3.12.14; the pinned numpy has no 3.11 build) and Node 18 or later. There are no npm dependencies and no build step; `package.json` only marks `.js` files as ES modules.

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Rebuild everything from the committed inputs, in order:

```sh
python -m data.fetch_power --lat 6.6034 --lon -0.7121 --year 2025   # optional: the raw NASA POWER CSV is committed
python -m data.build_weather --raw data/raw/power_6.6034_-0.7121_2025.csv   # web/weather.json
python -m data.gen_batches        # data/batches.csv and data/manifest.json
python -m model.depth_sweep       # optional: the validation-only depth check, evidence/depth_sweep.json
python -m model.train             # web/tree.json, docs/tree_rules.md, evidence/training.json
python -m model.parity            # tests/fixtures/parity_cases.json
python -m model.evaluate          # evidence/metrics.json, web/metrics.json, evidence/demo_batches.json
UPDATE_SIZES=1 python -m pytest tests/test_size.py   # evidence/sizes.json
```

The same seed gives a byte-identical dataset and the same tree hash on macOS and Linux; CI checks this on every pull request.

Run the tests:

```sh
python -m pytest
for f in tests/test_*.mjs; do node "$f"; done   # contract, encoder and tree.js parity with scikit-learn
node --test tests/*.test.mjs                    # the app
```

After changing any file in `web/`, update `PRECACHE` and `CACHE_VERSION` in `web/sw.js` (`node --test tests/sw.test.mjs` prints the lines to paste) and refresh `evidence/sizes.json` with the command above, or installed phones keep the old files and CI fails. The shared rules for inputs, features, bands and messages are in `web/contract.json` and [docs/contracts_v2.md](docs/contracts_v2.md).

## Data

| Dataset | Source | Licence or terms | Size |
|---|---|---|---|
| Weather, `web/weather.json` and `data/raw/power_6.6034_-0.7121_2025.csv` | NASA POWER Hourly API v2.10.2 (MERRA-2), T2M and RH2M for 2025, accessed 3 October 2026 | "There are no restrictions on the use, access, and/or download of data from the NASA POWER Project", with a request to cite it ([AWS Registry of Open Data listing for NASA POWER](https://registry.opendata.aws/nasa-power/)) | 24 KB (raw CSV 214 KB) |
| Synthetic batches, `data/batches.csv` | Generated here by `data/gen_batches.py` from `data/generator_config.json`, seed 20261003 | MIT (this repository) | 894 KB, 5,760 batches |
| Model, `web/tree.json` | Trained here by `model/train.py` | MIT (this repository) | 12 KB, 115 nodes |
| Messages, `web/messages.en.json` and `web/messages.tw.json` | English written by the team; Twi: 93 of 96 strings machine-drafted, then checked line by line by a fluent Twi speaker on the team; 3 not checked by a speaker: `weather_days` and `weather_strip` (drafted from published sources) and `weather_note` (machine-drafted) | MIT (this repository) | about 4 KB each |
| Demo location point | OpenStreetMap (village point) and GeoNames (ID 2303145) | OpenStreetMap: ODbL, © OpenStreetMap contributors. GeoNames: CC BY 4.0 | one coordinate pair |

No audio ships yet. The whole app (`web/`) is about 250 KB; [evidence/sizes.json](evidence/sizes.json) lists every file.

**Weather citation, in the wording the POWER project asks for:** "The data was obtained from National Aeronautics and Space Administration (NASA) Langley Research Center's Prediction Of Worldwide Energy Resources (POWER) project funded through the NASA Earth Science Division." Request URL: https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=T2M,RH2M&community=AG&longitude=-0.7121&latitude=6.6034&start=20250101&end=20251231&format=CSV&time-standard=LST

**Demo location: Bepong, Kwahu South District, Eastern Region, Ghana (6.6034, -0.7121), language Twi.** The Ministry of Food and Agriculture's [Kwahu South district profile](https://mofa.gov.gh/site/directorates/district-directorates/eastern-region/197-kwahu-south) lists Bepong under coffee in its crops table and gives the district's people as 66% Kwahu and 17% Ashanti, both Twi-speaking. Afrifa, Ofori-Frimpong and Abekoe (2009), *West African Journal of Applied Ecology* 11, [doi:10.4314/wajae.v11i1.45717](https://doi.org/10.4314/wajae.v11i1.45717), sampled "Cocobod coffee plantations at ... Bepong". The decision and its sources are recorded in [issue #1](https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/1).

**Synthetic labels.** Each batch's label comes from a documented moisture rule tied to the FAO 12% limit (`data/generator_config.json`, where every parameter names its source: FAO, Codex or ASSUMPTION). There are 60 farms of 80 batches, split 36, 12 and 12 by farm, plus 12 stress farms whose checks all fall in September to November, a season the main farms never see. One assumption changed from the spec's starting values (the storage time constant, from 20 to 120 days), and the config records why.

**What our data does not cover:**

- No real parchment moisture, water activity, mould or grade measurements. All labels are synthetic.
- No public dataset links smallholder storage conditions to parchment quality outcomes. That gap is the problem this tool starts on.
- NASA POWER is coarse gridded data. It doesn't capture conditions inside a house, a store or a bag.
- One location and one year of weather. No other regions, no robusta, no dry-processed cherry.
- Most coffee in this area is robusta and often sold as dried cherry, so the parchment thresholds follow the brief's scenario rather than local practice.
- No farmer registry, no real users and no field test.
- Price figures are national and dated, not live or local.
- Local-language messages are checked by one speaker; dialect variation isn't covered.

## Results

**These numbers are on synthetic labels from the documented rule, not field accuracy.** They show how well the tree recovers that rule compared with a one-variable humidity rule (red if the 14-day average humidity is above 80%, otherwise green), on 12 test farms the tree never saw.

**Bad batches called safe:** of the truly red batches, the tree showed **3.1%** as green. The humidity-only rule showed **35.8%** as green.

| Test farms, 960 batches ([web/metrics.json](web/metrics.json)) | Tree | Humidity-only rule |
|---|---|---|
| False reassurance (true red shown green) | 3.1% | 35.8% |
| Red recall (true red shown red) | 72.7% | 64.2% |
| Accuracy, on batches given a result | 74.7% | 50.7% |
| Macro F1, on batches given a result | 0.741 | 0.384 |
| Not sure | 0.5% | 0% |
| Coverage | 99.5% | 100% |

On the 12 stress farms (September to November, a season absent from training), the tree's false reassurance was 2.8% against the rule's 21.2% ([evidence/metrics.json](evidence/metrics.json)). Of the 16 test batches that were rained on during drying and checked in dry weeks and that the rule labels amber or red, the humidity-only rule called all 16 green and the tree called none of them green.

**Where the tree is weaker:**

- About a quarter of truly red test batches (24%) are shown amber ("check this batch soon") instead of red.
- On the stress season the tree catches fewer red batches than the humidity rule (75.8% against 78.8%), because that rule says red for most of the humid months.
- Not sure is now rare for complete answers (0.5% of test batches), so the low-confidence safety net seldom triggers.
- The hand test carries much of the weight: a rained-on batch whose hand test says dry still comes back green.

The tree uses the rewetting and floor answers directly. Its depth was chosen from 3 to 6 using validation farms only, before any test result was computed ([evidence/depth_sweep.json](evidence/depth_sweep.json)); its rules are written out in [docs/tree_rules.md](docs/tree_rules.md).

## Responsible AI

- **Human oversight:** the tool informs; the farmer and the cooperative decide. Red and not sure name a person and a physical check.
- **Fail-safe:** not sure is a first-class result and is shown in the demo.
- **No generated text:** every result, reason and action comes from a fixed message file.
- **Privacy:** no account, name, number or location. Records stay in the browser, with one-tap delete.
- **Consent:** a first-run screen explains that records stay on the phone and nothing is sent.
- **Bias and limits:** labels come from published thresholds, not from farmers' own batches; the weather is one grid cell; the Twi messages were checked by one speaker; and the smartphone may belong to another household member, which is why the design is a weekly check.
- **Registries:** if this ever feeds a farmer registry, that must be opt-in, because farm-level records could weaken a farmer's position with buyers.

## Claims we make and claims we don't

We claim, with the evidence linked above: the app runs offline after one load (checked in a desktop browser; the real-phone check is pending); the model is 12 KB; on held-out synthetic farms the tree scores the reported metrics against the baseline; results come only from the fixed message set.

We do not claim reduced losses, higher income, food safety, real-world accuracy or real SMS delivery. The farmer described in our specification is a persona, not a real person.

## Prior concept disclosure

SankofaFresh existed as an idea before the event. All code in this repository was written during the event; the repository history starts on 3 October 2026.

The original plan (a tomato storage hub, before the team moved to coffee) and the event-weekend planning material are in [archive/](archive/README.md).

## What happens next

**Planned, not done.** None of this has started; it is how the tool would move from synthetic labels to real ones.

- **A pilot with one cooperative in Kwahu South.**
- **Real labels.** When a farmer takes a sampled batch to the cooperative's moisture meter, the reading becomes a real label for that batch, replacing the synthetic ones. It is opt-in, and it stays on the phone until the farmer chooses to share it.
- **Retrain and re-evaluate on real labels**, reported the same way as now: against the humidity-only rule, on farms the tree never saw.
- **More languages** by translating the fixed message list, with no retraining.
- **Running cost:** static hosting, with no server to run.

## Licence

MIT, copyright (c) 2026 The SankofaFresh contributors; see [LICENSE](LICENSE). The NASA POWER, OpenStreetMap and GeoNames data keep their own terms, listed under [Data](#data).

## Team

GitHub: GeorgeDavidson2, devfrankduah.

## Project documents

- [Specification v2](docs/SankofaFresh_Spec_v2.md): the design record
- [Contracts](docs/contracts_v2.md): inputs, features, bands, messages and the tree.json format shared by Python and JavaScript
- [Tree rules](docs/tree_rules.md): the shipped decision tree written out as readable rules
- [Acceptance evidence](docs/ACCEPTANCE.md): each acceptance criterion with its evidence
- [Archive](archive/README.md): superseded planning material, kept for transparency
