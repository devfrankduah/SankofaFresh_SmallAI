**Superseded by [docs/SankofaFresh_Spec_v2.md](SankofaFresh_Spec_v2.md).** This v1 specification is kept unchanged as history.
# SankofaFresh Small AI
## Project overview and implementation specification

Version 1.1 | 3 October 2026 | Status: specification, software not yet built

## 1. What we are building

SankofaFresh is a mobile-friendly web application that runs a small AI model locally to help a village storage operator identify produce batches that need attention before their market quality declines.

For the hackathon, build a virtual shared storage hub with simulated temperature and humidity sensors. Run the simulator, database and trained model on a laptop. Show batch assessments, clear alerts and evidence of local operation. No physical sensors are required.

The intended future system uses solar-powered sensor devices in village storage hubs. This prototype demonstrates the software workflow. It does not demonstrate solar performance, microcontroller deployment or accurate field predictions.

### Product objective

Help the operator answer: Which batch needs inspection first, and what information caused this warning?

The system supports action before quality declines. A warning alone does not prevent losses. The farmer must have a practical option to inspect, protect, process or sell the produce.

### Users

| User | Need | Main interaction |
|---|---|---|
| Storage operator | Monitor produce and prioritize inspection | Register batches, review conditions, acknowledge alerts, record actions |
| Farmer | Understand a warning for their batch | Read a simple message or play a reviewed recording |
| Team and judges | Inspect the system and evidence | Run scenarios, compare policies and inspect test results |

## 2. Frozen minimum scope

| Item | Decision |
|---|---|
| Sector | Agriculture |
| Crop | Tomatoes only |
| Demonstration | Three batches in one storage zone |
| Product | Responsive web application, phone-first layout |
| Frontend | Local HTML, CSS and JavaScript |
| Backend | Python and FastAPI, one process and one worker |
| Persistence | SQLite |
| Prediction | Compact trained decision tree, maximum depth 4 as the starting configuration |
| Runtime | Local laptop; no network calls during inference |
| Inputs | Simulated readings and manually entered batch metadata |
| Evidence mode | SYNTHETIC_DEMO until suitable observed data pass review |
| Alerts | In-app text and virtual indicator lights |
| Optional features | Bundled reviewed audio; economic scenario calculator |
| SMS | Preview only, labeled SIMULATED_NOT_SENT |

Exclude native Android/iOS builds, account management, payments, live market prices, physical hardware, real SMS integration and cloud model calls from the minimum build.

### Offline boundary

The laptop hosts the application, model and database. Its browser works without internet after installation. A phone can access the application through the same local Wi-Fi network if that network permits communication between devices. The laptop must remain on and reachable. The phone cannot run this version independently when disconnected from the laptop.

Default server binding is localhost. For a controlled phone demonstration, use the laptop's LAN address and an explicit LAN server binding. This prototype has no authentication and must not be exposed to the public internet.

## 3. User workflow

1. The operator registers a tomato batch with harvest time, receipt time, maturity, visible damage and quantity.
2. The operator selects a scenario and starts the virtual storage hub.
3. The simulator produces readings at five-minute simulation intervals.
4. The backend validates and stores readings, then builds features from information available at the current simulation time.
5. The trained model produces a synthetic risk score when sufficient supported data are available.
6. The policy converts valid scores into alert states and suppresses repeated messages.
7. The operator opens the batch, acknowledges the alert and records an action.
8. The evidence screen reports comparison results and the limits of the demonstration.

## 4. Screen specifications

### Storage overview

Show the zone temperature, humidity, sensor data status, simulation time and last received update. Show three batch cards with batch ID, quantity, age, assessment state and last assessment time. Order actionable warnings before other batches. Provide Register batch and Open batch actions.

Empty state: explain that no batches are registered and show the registration action. Loading state: show that data are loading. Connection failure: preserve the last known display, mark it disconnected and show its timestamp. Never present an old assessment as current.

### Batch details and registration

Registration fields: crop fixed to tomato, harvest time, receipt time, maturity, visible damage and quantity in kilograms. Validate required fields before submission and display server validation errors beside the affected field. Do not silently replace unknown maturity with a known value.

Details show metadata, recent reading history, synthetic risk score, data status, observed input factors, alert history and recorded actions. Provide Acknowledge alert and Record action controls. Acknowledgment is not a claim that the batch is safe.

### Farmer alert view

Show the selected batch, large status text and icon, last assessment time and a short message. The operator selects the batch; no farmer login is required. Optional audio uses a bundled recording after the user enables sound. Keep text available when sound is disabled. Do not use online speech services.

Initial message templates: green: No elevated risk detected in this demonstration; amber: Inspect this batch soon; red: Inspect this batch promptly and review available handling or sale options; unavailable: A current assessment is unavailable. Check the readings. These are prototype messages. Crop-specific operational advice requires review.

### Simulation and evidence

Controls: scenario, seed, start, pause, resume, single step, playback speed and create new run. Show which sensor values are simulated. Separate simulation controls from the farmer view.

Evidence includes model version, model hash, evidence mode, baseline comparison, held-out event counts, warning lead time, missed events, false-alert episodes, coverage, model size and inference benchmark. Empty metrics show Not evaluated, not zero. Optional financial scenarios show all assumptions and intervention costs.

### Interface acceptance

- No horizontal page scrolling at 360 px width or on the demo laptop.
- Main touch controls have a target of at least 44 by 44 CSS pixels.
- Core actions work by touch and keyboard and do not require hover.
- Status uses text and icons as well as color.
- Invalid, loading, empty and disconnected states are visible.
- A synthetic-data label remains visible on assessment and evidence screens.
- Phone access is tested on the actual demonstration network before claiming it works.

## 5. Architecture and module ownership

The browser sends JSON requests to FastAPI and polls current state once per second. FastAPI serves the local interface and assets. One server loop advances simulation time. Multiple browser tabs must not advance it independently.

| Module | Responsibility | Suggested role |
|---|---|---|
| app/main.py | API routes, application lifecycle, local assets | Backend |
| app/schemas.py | Validated request and response contracts | Backend with all owners |
| app/simulator.py | Seeded scenarios, clock and hidden synthetic quality trajectories | Backend |
| app/features.py | Past-only features and data eligibility | Model |
| app/inference.py | Trusted model loading and pure inference | Model |
| app/policy.py | Baseline and AI policy, state transitions and reminders | Backend and model |
| app/storage.py | SQLite transactions, persistence and recovery | Backend |
| static/ | Mobile interface, local charts and recordings | Interface |
| training/ | Generation, training, export and evaluation | Model |
| tests/ | Contracts, leakage, replay, recovery and offline evidence | Integration |

Pipeline: validate reading, persist observation, extract features, assess eligibility, execute model, apply policy, persist prediction and alert state, return snapshot. Commit a simulation step and its outputs atomically. Do not train inside the running application.

Roles are not yet assigned to named teammates. Use A for data/model, B for backend/simulator, C for interface, D for integration/evidence/submission. For two people, combine A+B and C+D. One named teammate owns merge decisions.

## 6. Data contracts

Use schema_version=1, stable unique IDs and UTC ISO 8601 timestamps. Distinguish simulation time from wall-clock time. Batch records are immutable in the minimum build; record actions separately.

| Entity | Required fields |
|---|---|
| Batch | batch_id, zone_id, crop, harvest_at, received_at, initial_maturity, damage_present, quantity_kg, history_known_from, status |
| Reading | reading_id, run_id, zone_id, observed_at, temperature_c, relative_humidity_pct, source, quality |
| Prediction | prediction_id, run_id, batch_id, as_of, horizon_hours, model_version, evidence_mode, score, probability, data_status, reasons |
| Alert | alert_id, run_id, batch_id, prediction_id, level, created_at, acknowledged_at, message_code, channel, delivery_status |
| Run | run_id, scenario_id, seed, config_version, sim_time, step_index, speed, state, model_hash |
| Action | action_id, batch_id, run_id, recorded_at, action_type, assumptions |

Enums: maturity = immature, mature, ripe, unknown; run state = paused, running, completed; assessment state = green, amber, red, unavailable; evidence mode = SYNTHETIC_DEMO or REAL_DATA_EXPERIMENTAL; data status = valid, insufficient_history, stale, outside_model_support.

Validate positive finite quantity, received_at >= harvest_at, finite temperatures and humidity in [0,100]. The synthetic generator supports 10 to 45 degrees Celsius; values outside that range produce outside_model_support rather than a fabricated model result. Missing measurements use null or absent observations, never zero. Reject duplicate reading IDs, non-monotonic observations and unsupported crops. Unknown maturity makes the minimum model assessment unavailable.

Create separate SQLite tables for entities, run configuration, trajectories and persisted policy state. Enable foreign keys. Use a unique constraint on reading IDs and alert deduplication keys. Store generated trajectories, including hidden synthetic outcomes, so restart does not depend on reconstructing RNG state. Keep hidden outcomes out of API snapshots until an explicit completed-run evaluation export.

## 7. API specification

All routes use /api/v1. All mutations return the affected ID and schema version. Return 422 for invalid input, 404 for unknown resources and 409 for invalid state transitions. Use a consistent error envelope with code, message and field errors. Escape user-supplied text in the UI.

| Method | Route | Purpose |
|---|---|---|
| GET | /health | Confirm local service and model status |
| POST | /batches | Register a validated batch |
| GET | /batches | List batches with current assessments |
| GET | /batches/{id} | Get batch metadata, alerts and actions |
| POST | /runs | Create paused run from scenario, seed and configuration |
| POST | /runs/{id}/control | start, pause, resume, step or set_speed |
| GET | /runs/{id}/state | Current public snapshot |
| POST | /runs/{id}/readings | Ingest readings through the same validator as the simulator |
| POST | /alerts/{id}/ack | Idempotent acknowledgment |
| POST | /actions | Record a batch action |
| GET | /runs/{id}/export | Export history, configuration and provenance |

Only one active run is allowed in the minimum build. Create/reset starts a new run ID and preserves previous results. The speed value affects wall-clock playback only. A step advances exactly five simulated minutes. GET requests never advance time.

Example prediction:

```json
{
  "schema_version": 1,
  "prediction_id": "P012",
  "run_id": "RUN01",
  "batch_id": "B02",
  "as_of": "2026-10-03T18:00:00Z",
  "horizon_hours": 24,
  "model_version": "tree-demo-1",
  "evidence_mode": "SYNTHETIC_DEMO",
  "score": 0.74,
  "probability": null,
  "data_status": "valid",
  "reasons": ["older_batch", "sustained_heat_exposure"]
}
```

This is an invented contract example. For unavailable assessments, score and probability are null. Reasons describe observed factors or model path conditions; they do not establish causal explanations.

Pure interfaces: validate_reading -> valid reading or error; extract_features(batch, history, as_of) -> ordered features or unavailable; predict(features, model_bundle) -> prediction; apply_policy(prediction, prior_state, sim_time) -> policy state; advance_run(run_id, steps) -> snapshot.

## 8. Model specification

### Task and evidence

Target: for a batch that is currently marketable in the simulation, estimate whether it crosses a defined synthetic quality threshold during (as_of, as_of + 24 hours]. A batch already below the synthetic quality threshold is excluded from this forecast evaluation. The application must not use hidden quality to gate inference or imply knowledge of current real quality; operators still need inspection.

Default mode is synthetic. A model trained on synthetic outcomes can demonstrate local execution and behavior inside the simulator. It cannot establish farm accuracy. Keep probability=null and call the output a synthetic risk score.

### Feature contract v1

Use the following ordered features, computed using readings at or before as_of:

| Feature | Definition |
|---|---|
| age_hours | Hours since harvest |
| maturity_code | immature=0, mature=1, ripe=2; unknown abstains |
| damage_present | 0 or 1 |
| temp_mean_1h | Mean valid temperature over (t-1h,t] |
| temp_max_1h | Maximum valid temperature in that window |
| temp_mean_6h | Mean valid temperature over (t-6h,t] |
| rh_mean_6h | Mean valid humidity over (t-6h,t] |
| heat_degree_hours_6h | Sum max(T-25,0) * 5/60 for valid scheduled readings in the six-hour window |
| coverage_6h | Valid paired readings divided by 72 expected five-minute readings |

Require six hours of measured history, at least 58 of 72 valid paired readings in the six-hour window and at least 10 of 12 in the one-hour window. Do not interpolate for the minimum model. Stop fresh predictions after two expected readings are missed. Do not invent pre-arrival storage history. For a fast demo, replay a clearly labeled six-hour warm-up through the same ingestion path before displaying predictions.

The 25-degree exposure reference is a synthetic feature choice, not a verified tomato handling limit. Record support ranges for all features in the model bundle. Abstain outside declared support. Keep feature order, units and encoding identical in training and runtime.

### Training and export

Start with DecisionTreeClassifier(max_depth=4). Split independent simulation runs before creating time windows: approximately 60% training, 20% validation and 20% test. Batches sharing a run stay in one split. Record exact run IDs. Tune model settings and alert thresholds on validation only; freeze before test evaluation.

Export an explicit JSON tree with node indices, feature indices, thresholds, child indices, leaf scores, feature contract, support ranges, version and hash. Match scikit-learn input precision and <= branch comparisons in the runtime. Test export parity, including threshold boundary cases. Load only trusted project artifacts.

Do not provide scenario ID, future temperature, deterioration state, future quality or event time as model inputs. Vary held-out parameters as an additional stress test. Do not select only favorable test runs.

### Real-data option

Switch only if a licensed dataset has tomato batch histories, timestamped conditions and observed future quality outcomes. Fresh/rotten image labels alone do not meet this requirement. Record source, license, checksum, units, exclusions and split. Confirm the quality grade and horizon. Revalidate features and score interpretation. Calibrated real-world probabilities require suitable calibration evidence.

## 9. Simulation contract

Use a 72-hour trajectory plus a further 24 hours available only for future-label construction. Display at most the first 72 hours. Forecast examples need a complete next-24-hour outcome window. Five-minute steps give 12 observations per hour. Use separate deterministic random streams for sensor noise, batch variation and missingness. Record all configuration values.

### Toy quality generator v1

This formula is an unvalidated teaching model. It is not tomato biology.

Set initial hidden deterioration at receipt to min(0.8, 0.08 * age_days_at_receipt + 0.12 * maturity_code + 0.10 * damage_present + batch_offset). batch_offset is uniform in [0,0.1]. For each five-minute step, add dt_hours * batch_factor * (0.002 + 0.0008 * max(T-20,0) + 0.00015 * max(RH-80,0)), where batch_factor is uniform in [0.8,1.2]. Quality downgrade occurs when this hidden state first reaches 1. These coefficients are arbitrary simulation settings.

True simulated conditions continue during missing observations. The model sees only the available observations. Keep latent batch_offset, batch_factor and deterioration out of feature extraction. Do not infer food safety from this quality state.

Temperature uses a configured daily cycle, bounded noise and optional heat disturbance, clamped to 10..45 C. Humidity is generated separately and clamped to 0..100%. Store the true trajectory and observation mask separately. Persist trajectories for restart and reproducible evaluation.

| Scenario | Required behavior |
|---|---|
| Stable storage | Establish ordinary monitoring without repeated messages |
| Sustained heat | Exercise exposure features and record actual warning behavior |
| Different batch ages | Same zone readings, different observable metadata |
| Missing sensor | Stop current scores, mark stale and retain unresolved warnings |
| Internet disabled | Local workflow continues |
| Process restart | Restore run position and policy state without duplicate alerts |

A single zone sensor cannot detect crate-specific microclimates. Do not script an alert solely because a scenario name says heat. The model and policy must determine the output.

## 10. Alert and action policy

Synthetic initial bands: green <0.40; amber 0.40 to <0.70; red >=0.70. Tune and freeze these on validation if needed. These are demonstration bands, not agronomic limits.

Require three consecutive valid updates for escalation and six for downgrade. Any invalid update clears the candidate transition counters and cannot count toward a downgrade. Unavailable data is a separate data-status overlay. Preserve unresolved earlier warnings and show their original timestamp.

Emit a message when severity changes. Suppress duplicate same-severity reminders for 60 simulated minutes. Higher severity overrides cooldown. Persist counters, state, message IDs and timestamps. Acknowledgment changes acknowledged_at only; it does not reset risk or resend the message. Display SMS as SIMULATED_NOT_SENT.

Record actions such as inspected, removed_from_storage, sale_planned and other with a note. In the minimum build, logging an action does not change sensor history or calculate avoided losses. Intervention branches are optional and require explicit effect assumptions and identical underlying random disturbances for comparisons.

## 11. Baseline and value measurement

Compare the trained model with a sustained-temperature threshold baseline. Tune baseline thresholds and duration on validation. Add an age/exposure baseline if time allows. Use the same observed histories, forecast opportunities and alert timing logic for fair policy comparisons.

Report prediction-level confusion counts and event-level warnings separately. Define a qualifying warning as an amber/red transition within 24 hours before a downgrade event. Lead time is event time minus the first qualifying warning time. A false alert episode is an amber/red episode with no event in the 24 hours after episode onset; exclude censored onsets without full follow-up. An episode ends after valid policy downgrade to green. Unavailable data does not end an episode. Report episodes per monitored batch-day and assessment coverage.

Repeated windows are correlated. Report independent run and event counts. With few events, report descriptive results and do not claim statistical superiority. Report weaker AI performance if observed.

Optional economic scenario: net proceeds = saleable_kg * achieved_price_per_kg - added_costs. Incremental benefit = policy net proceeds - comparator net proceeds. A 100 kg example with assumed 70 kg saleable at $0.50/kg gives $35. An assumed intervention with 92 kg saleable and $6 cost gives $40, a hypothetical $5 benefit. These are assumptions, not field results. Do not convert model accuracy into kilograms saved.

## 12. Setup and delivery plan

This document defines planned commands. They will work only after application files and the dependency lock are implemented.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
python -m pytest
```

Use Python 3.11 or 3.12 as the team baseline and record the exact tested version. Development dependencies include FastAPI, Uvicorn, Pydantic, NumPy, scikit-learn, pytest and httpx. Freeze tested versions in the repository. Bundle all frontend scripts, fonts, icons and recordings. Disable remote Swagger assets or serve them locally. Installation requires internet or a prepared dependency cache; runtime must not require internet.

For an explicitly controlled LAN demonstration, replace the host value with 0.0.0.0 and open the laptop's LAN IP on the phone. Test device communication and firewall behavior. This is a temporary local demo server, not a production deployment.

Suggested repository directories: app/, static/, training/, models/, tests/, docs/, data/manifests/ and evidence/. Ignore .venv, secrets, local SQLite files and temporary exports. Save provenance/configuration and approved evidence explicitly.

## 13. Acceptance criteria and release gate

All criteria below are requirements, not achieved results.

| ID | Criterion | Evidence |
|---|---|---|
| AC01 | Register valid batches; reject invalid quantity, date order and crop | API tests and UI check |
| AC02 | Same seed/config/model produces identical readings, predictions and alerts | Deterministic replay comparison |
| AC03 | Future readings cannot change an earlier prediction | Leakage test |
| AC04 | Missing readings cause unavailable/stale status and null fresh score | Scenario test |
| AC05 | Restart restores records, run position and alerts without duplicates | Restart test |
| AC06 | Exported tree matches training predictions, including boundaries | Parity results |
| AC07 | Scores use real observable features and handle unsupported inputs | Feature tests and support checks |
| AC08 | Internet-disabled restart/reload supports UI, inference and bundled audio if included | Recorded offline check |
| AC09 | 360 px interface works without horizontal scroll; status does not rely on color | Phone-sized and keyboard check |
| AC10 | Phone accesses laptop on actual LAN if phone operation is claimed | Actual device check |
| AC11 | AI and baseline use the same held-out histories; event counts and burden are reported | Evaluation export |
| AC12 | Synthetic evidence never appears as real-world probability or measured farm benefit | Claims review |
| AC13 | Model below 250 KB and p95 inference below 50 ms are measured targets | 100+ warmed calls, laptop/runtime details; report failures honestly |
| AC14 | A teammate can launch from the README and dependencies are pinned | Clean-environment rehearsal |

Report total application memory separately from model size. Laptop results do not prove microcontroller readiness. A release requires the trained local model, full operator workflow, reliability tests and labeled evaluation. A threshold-only workflow is an integration milestone, not the final Small AI demonstration.

## 14. Build sequence and priorities

1. Confirm competition brief and permitted work window, assign owners, commit contracts and shared fixtures.
2. Build batch registration, SQLite, simulator and state endpoint.
3. Connect the mobile interface to a complete baseline workflow.
4. Generate independent runs, train and export the compact model, then integrate inference.
5. Implement policy persistence and failure behavior.
6. Run held-out comparison, offline/restart tests and mobile checks.
7. Freeze features, record backup demonstration and complete submission materials.

P0: complete local workflow, trained model, reliable state, basic mobile interface, evidence labels and release tests. P1: local-language audio and stronger baseline. P2: intervention branches and financial scenario tool. Cut P2 before reducing P0 verification.

Use GitHub issues only. Every issue needs context, scope, suggested owner role, priority, dependencies, acceptance criteria and required evidence. Keep implementation tasks small enough for the hackathon. Team names and issue assignments remain open.

## 15. Demonstration and claim limits

Demonstrate registration, a replay with heat, model output, an operator alert, internet disconnection, missing-sensor behavior and baseline results. Adapt the recording length to the official requirements.

Permitted claims after successful tests: the compact model runs locally on the measured laptop; the installed application runs without internet; the model predicts defined synthetic outcomes on held-out simulation runs; alerts and persistence behave as tested.

Unproven claims: percentage farm-loss reduction, real-world spoilage accuracy, food safety, solar endurance, cellular delivery and embedded-device runtime. Hardware deployment and field validation are later phases.

## 16. Outstanding external decisions

- Confirm participant acceptance, registered team and complete agriculture brief.
- Confirm simulation, prior concept/code/model rules, required technology and exact submission deadline.
- SankofaFresh is an existing concept; disclose the prior concept and identify work created in the permitted window.
- Confirm named owners, demo laptop, local network and reviewed audio language.
- Review real data if available; otherwise keep the documented synthetic mode.

These external confirmations remain unresolved. Do not describe organizer approval as received.

## 17. References and implementation alternatives

The earlier handoff reviewed the following references. This revision does not claim a new verification of organizer rules.

- World Bank challenge: https://www.worldbank.org/en/events/2026/10/19/global-ai-and-digital-summit-2026
- Public event schedule: https://luma.com/z3za7zow
- FastAPI local static files: https://fastapi.tiangolo.com/tutorial/static-files/
- scikit-learn decision trees: https://scikit-learn.org/stable/modules/tree.html
- Coldtivate functionality: https://docs.coldtivate.org/core-concepts/functional-features/
- Empa virtual cold-chain research: https://www.empa.ch/web/simbiosys/data.org

Existing cold-chain monitoring and shelf-life tools mean we should not claim global novelty. Our proposed advantage is a clear village-hub workflow with compact local inference and explicit failure handling. Its usefulness still needs evaluation.

Alternative 1: rules-only monitoring is simpler and serves as the comparator, but does not satisfy our final trained-model scope. Alternative 2: a browser-based Progressive Web App can later run independently on a phone, but requires separate local inference, storage and offline-update work. Alternative 3: real sensors can replace the simulator through the reading contract after hardware becomes available.

## 18. Codex handoff instruction

Use this document as the product and technical specification for GeorgeDavidson2/SankofaFresh_SmallAI. First create repository documentation and detailed task issues without a project board. Preserve the agreed stack and scope. Record unresolved competition checks without inventing answers. Then implement in the build order above when authorized. Distinguish specification, implemented behavior and verified evidence in all documentation. Do not mark acceptance criteria complete until the required checks pass.
