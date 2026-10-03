"""Generate reviewable issue bodies. No network calls or application implementation."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TASKS = []

def add(key, title, role, priority, hours, deps, sections, scope, criteria, evidence):
    TASKS.append(dict(key=key, title=title, role=role, priority=priority,
                      estimate=hours, deps=deps, sections=sections, scope=scope,
                      criteria=criteria, evidence=evidence))

add('coordination', 'Confirm competition rules, named owners and demo environment', 'D', 'P0', '0.5–1', [], '14, 16',
    ['Obtain the complete competition brief, participant acceptance, registered team, permitted work window, exact deadline and timezone, technology requirements, and simulation/prior-work rules.',
     'Record prior SankofaFresh concept disclosure and distinguish pre-existing material from work created during the permitted window.',
     'Name role A (model), B (backend), C (interface), D (integration), one merge owner and demo laptop/network. For two people combine A+B and C+D. Obtain GitHub handles before assigning or inviting anyone.'],
    ['Record each external answer with source/date or explicitly mark unresolved; do not claim organizer approval.', 'Record laptop OS/Python and intended LAN test arrangement.', 'Publish owner and merge-review coverage; resolve competition eligibility before final submission.'],
    ['Linked organizer evidence and owner matrix; unresolved decisions with responsible person.'])

add('contracts', 'Freeze v1 schemas, errors, interfaces and shared fixtures', 'B', 'P0', '1–1.5', [], '5–8, 10',
    ['Implement app/schemas.py and document all /api/v1 request/response contracts, enums, UTC timestamps, schema_version=1 and simulation versus wall time.',
     'Define batch/reading/prediction/alert/run/action, public state, export and health shapes; keep hidden outcomes out of public schemas. Fix tomato-only immutable metadata and maturity unknown semantics.',
     'Freeze pure interfaces validate_reading, extract_features, predict, apply_policy and advance_run with roles A/C/D. Supply three-batch, valid, unavailable, invalid and error JSON fixtures.',
     'Resolve and document unspecified action note/assumptions shape, batch status/reading quality enums, observation alignment, active-run rules, history_known_from semantics and support-status precedence; do not hide decisions in implementations.'],
    ['Validation rejects non-finite/non-positive quantity, reversed dates, unsupported crops and invalid humidity; unknown maturity remains unknown.', 'Errors consistently contain code/message/field errors; 422/404/409 and mutation ID/version responses have fixtures.', 'Endpoints, feature order and nullable unavailable score/probability are reviewed by all module owners.'],
    ['Contract tests and versioned fixtures; reviewed decision notes.'])

add('scaffold', 'Create pinned Python scaffold, local assets and CI checks', 'D', 'P0', '0.75–1.5', [], '2, 5, 12',
    ['Create app/, static/, training/, models/, tests/, data/manifests/ and evidence/ with minimal importable scaffolding.', 'Choose and record tested Python 3.11 or 3.12; freeze tested FastAPI/Uvicorn/Pydantic/NumPy/scikit-learn/pytest/httpx versions and a reproducible installation process.', 'Configure CI to run meaningful tests as they land; serve local assets and disable remote Swagger assets. Document one-worker localhost startup.'],
    ['Fresh virtual environment installs pinned dependencies and imports the scaffold.', 'CI runs on pull requests without secrets; no model training at application startup.', 'No CDN/font/script dependencies; local DBs, .venv, secrets and temporary exports are ignored.'],
    ['Clean install log, exact Python version and initial CI run.'])

add('storage', 'Implement SQLite schema, atomic steps and restart persistence', 'B', 'P0', '1–2', ['contracts', 'scaffold'], '5–7, 9–10',
    ['Implement app/storage.py tables for entities, run config, stored trajectories, observation mask and policy state with foreign keys.', 'Enforce reading uniqueness, alert deduplication and one-active-run constraints. Persist step outputs, predictions, alerts and policy state in one transaction.', 'Preserve past runs on new-run creation; load saved trajectory/clock/state rather than rebuilding RNG streams on restart.'],
    ['Duplicate IDs and invalid references fail without partial writes.', 'Injected failure during a step rolls back all outputs and run position.', 'Reopen database restores config, trajectories, step index, alerts and counters; batch metadata stays immutable.'],
    ['SQLite constraints, rollback and reopen tests.'])

add('simulator', 'Implement seeded 96-hour trajectories and single-owner simulation clock', 'B', 'P0', '1.5–2.5', ['contracts', 'storage'], '6–7, 9',
    ['Implement app/simulator.py with separate deterministic noise, batch variation and missingness streams; persist true conditions, observation mask and hidden quality.', 'Implement specification toy deterioration formula exactly, daily cycle/bounded noise/heat and clamps; expose only first 72 hours and reserve further 24 for labels.', 'Support stable, heat, age variation and missing-sensor configurations; controls create paused/start/pause/resume/step/speed, one server loop and five-minute steps.', 'Replay clearly labeled six-hour warm-up through normal ingestion. GETs/browser tabs never advance time; speed only changes wall-clock pacing.'],
    ['Same seed/config yields identical trajectories; latent outcomes never enter public snapshots.', 'Paused step advances exactly five minutes; invalid transitions return 409 and simultaneous active runs are rejected.', 'Multiple polling clients do not multiply clock speed; restart resumes persisted position.', 'True conditions continue through missing observations; missing values are never replaced with zero.'],
    ['Deterministic golden fixture, clock/control/concurrency and hidden-field exclusion tests.'])

add('features', 'Implement past-only feature extraction and assessment eligibility', 'A', 'P0', '1–2', ['contracts', 'scaffold'], '6, 8',
    ['Implement app/features.py shared by training/runtime with exact ordered nine features, window boundaries (t-window,t], units, maturity codes and heat-degree-hours formula.', 'Require measured six-hour history without invented pre-arrival values, 58/72 valid pairs in six hours and 10/12 in one hour; stop fresh scores after two missed scheduled readings.', 'Handle unknown maturity, insufficient history, stale and outside_model_support, including 10..45 C and model bundle support ranges; null fresh score/probability on abstention.'],
    ['Future observations cannot alter earlier feature vectors or eligibility (AC03).', 'Window edges, exact coverage cutoffs, two missed readings, unknown maturity and out-of-support values are tested (AC04/AC07).', 'Latent quality, scenario ID and future conditions are never read by this module.'],
    ['Hand-calculated feature fixture and boundary/leakage/eligibility tests.'])

add('batch_api', 'Implement batch, snapshot, action and acknowledgment APIs', 'B', 'P0', '1–2', ['contracts', 'storage'], '3–7, 10',
    ['Implement app/main.py batch registration/list/details, health, public state, action creation and idempotent acknowledgment routes using frozen contracts.', 'Expose recent observed history, original assessment timestamps, alerts/actions and data status; escape text at rendering boundary.', 'Record inspected/removed_from_storage/sale_planned/other actions with notes; actions do not change history or calculate avoided losses.'],
    ['AC01 valid and invalid registration cases pass; unknown IDs and malformed input use agreed errors.', 'Ack changes acknowledged_at only and repeated acknowledgment preserves it; it neither clears risk nor emits an alert.', 'Public responses exclude latent trajectories and never present an old score as fresh.'],
    ['API contract tests and action/ack idempotency tests.'])

add('policy', 'Implement persistent alert state machine and baseline policy', 'B', 'P0', '1–2', ['contracts', 'storage'], '7, 10–11',
    ['Implement pure apply_policy and persisted counters: initial bands <0.40/0.40..<0.70/>=0.70, three valid updates to escalate and six to downgrade.', 'Invalid updates reset candidates, cannot downgrade, and overlay unavailable while preserving unresolved warning timestamps.', 'Emit severity changes and deduplicated same-severity reminders after 60 simulated minutes; higher severity overrides cooldown. Persist message IDs/state/timestamps.', 'Implement configurable sustained-temperature baseline using the same alert timing logic; SMS preview, if exposed, is SIMULATED_NOT_SENT.'],
    ['Threshold equality, consecutive counters, invalid interruptions, escalation during cooldown and reminders are tested.', 'Acknowledgment does not reset risk/remind; unavailable data does not end an alert episode.', 'Reopened policy state does not duplicate emissions at a repeated step.'],
    ['Table-driven transition tests, baseline fixture and persistence integration tests.'])

add('training_data', 'Generate independent run dataset, labels and immutable split manifest', 'A', 'P0', '1–2', ['simulator', 'features'], '8–9, 11',
    ['Generate reproducible independent runs and derive next-24-hour synthetic event labels from stored hidden trajectories, only for currently marketable forecast examples with complete future follow-up.', 'Split runs approximately 60/20/20 before window creation; all batches in a run stay together. Record exact IDs/seeds/configuration, checksums and generation command.', 'Use only shared observable features and eligible windows. Include an additional held-out-parameter stress dataset without choosing favorable runs.'],
    ['Run-ID intersections across splits are empty; no future/latent/scenario variables appear in feature inputs.', 'Label edge cases exclude already-downgraded batches and censored forecast windows.', 'Manifest gives independent run/event counts and reproducible data provenance; data remains SYNTHETIC_DEMO.'],
    ['Dataset manifest, split/leakage/label tests and class/event counts per split.'])

add('train_export', 'Train depth-limited decision tree and export trusted JSON bundle', 'A', 'P0', '1–2', ['training_data'], '8, 10–11, 13',
    ['Train DecisionTreeClassifier starting at max_depth=4; tune tree, AI thresholds and baseline threshold/duration on validation only.', 'Freeze model/policies/config before test evaluation. Export node/feature indices, thresholds, children, leaf scores, contract, support ranges, version and hash.', 'Record dependencies, commands and run IDs. Keep probability=null and call predictions synthetic risk scores; no farm-accuracy claims.'],
    ['Bundle is valid explicit JSON with integrity hash and documented support; no pickle/untrusted model loading required.', 'Frozen artifacts and threshold provenance identify validation runs and leave test results unused for tuning.', 'Training script reproduces the bundle from manifest/config; model size is recorded without claiming target success until measured.'],
    ['Training command/log, validation report, frozen JSON bundle and provenance.'])

add('inference', 'Implement local tree interpreter and verify export parity/performance', 'A', 'P0', '0.75–1.5', ['train_export'], '7–8, 13',
    ['Implement app/inference.py trusted bundle loading, hash/contract validation and pure local traversal matching scikit-learn precision and <= comparison.', 'Abstain outside feature support; output observed factor/model path reason codes without causal claims.', 'Measure model bytes and p95 over at least 100 warmed inference calls; record laptop/runtime and application memory separately.'],
    ['AC06 parity holds on held-out feature vectors and float precision/threshold-boundary cases.', 'Missing/corrupt/incompatible bundle fails explicitly; no network calls or training in runtime.', 'AC13 targets <250 KB and p95 <50 ms are measured and failures reported honestly; unsupported inputs abstain.'],
    ['Parity test results, benchmark command/results and hardware/runtime details.'])

add('ui_core', 'Build responsive operator overview, registration and batch details', 'C', 'P0', '2–3', ['contracts', 'scaffold'], '3–4, 6–7',
    ['Implement local HTML/CSS/JS against shared fixtures, then wire APIs: overview/three batch cards, registration/details, recent readings, actions and acknowledgment.', 'Poll once per second without overlapping requests; retain last known data and timestamps on disconnect, visibly mark disconnected/stale.', 'Show field-level validation, empty/loading/errors, quantity/age/assessment time; order actionable warnings first and never coerce unknown maturity.'],
    ['Main controls are >=44x44 CSS pixels; keyboard/touch work without hover and status uses text/icons.', 'No horizontal scroll at 360 px and demo laptop; synthetic label remains visible.', 'Registration, details, action and ack flows work with fixtures including errors; live wiring verified in integration.'],
    ['360 px/laptop screenshots, keyboard checklist and fixture flow checks.'])

add('ui_sim', 'Build farmer alert view, simulator controls and evidence display', 'C', 'P0', '1–2', ['ui_core'], '4, 7, 10–11, 15',
    ['Build operator-selected farmer view with exact initial message templates, batch ID/icon/status/time and no login.', 'Add scenario/seed/create/start/pause/resume/step/speed controls separated from farmer view; show simulated values and warm-up explicitly.', 'Render evidence from versioned evaluation export: model version/hash/mode, baseline, run/event counts, coverage, lead time, misses, false episodes and benchmark; absent metrics say Not evaluated.'],
    ['Unavailable view asks to check readings and retains unresolved warning context; acknowledgment is not a safety claim.', 'Controls do not mutate clock through GET or client timers; prior run results remain accessible.', 'No fabricated zero metrics, real-world probabilities or farm benefit claims; all assets local.'],
    ['UI fixtures for evaluated/unevaluated/disconnected states and control walkthrough.'])

add('integration', 'Integrate transactional simulation-to-alert pipeline and full local workflow', 'B', 'P0', '1–2', ['simulator', 'features', 'batch_api', 'policy', 'inference', 'ui_sim'], '3, 5–10',
    ['Wire validate -> persist -> past features -> eligibility -> local inference -> policy -> atomic persistence -> public snapshot.', 'Connect reading ingestion and simulator to the same validator; reject duplicate/non-monotonic observations and enforce single clock/worker.', 'Implement export with config/provenance/history and explicit completed-run evaluation export gate for hidden outcomes.', 'Exercise full registration/warm-up/replay/alert/ack/action flow with three batches.'],
    ['End-to-end run shows actual model-driven outcomes rather than scripted scenario alerts.', 'Invalid/stale readings yield null fresh scores and preserve unresolved warnings.', 'Concurrent polling cannot advance clock; failed steps leave no partial outputs.', 'Active-run exports/public state cannot reveal hidden future outcomes; completed evaluation export is explicit.'],
    ['API end-to-end tests, exported sample run and workflow recording.'])

add('evaluation', 'Evaluate frozen AI versus baseline on held-out runs and report honest metrics', 'A', 'P0', '1–2', ['inference', 'policy', 'training_data'], '8, 11, 13',
    ['Evaluate frozen AI and validation-tuned baseline on identical observed histories, eligible opportunities and policy timing.', 'Report confusion counts separately from event warnings. Qualifying warning is amber/red transition within 24 hours before event; lead time uses first qualifying transition.', 'Count false episodes with no event in 24 hours after onset, excluding censored onsets; episodes end only after valid green downgrade, not unavailable data.', 'Export versioned machine-readable and readable results, independent run/event counts, misses, lead times, false episodes per monitored batch-day, coverage and stress-test results. Document denominator definitions.'],
    ['AC11 same-history/policy comparison is reproducible and test set has not been used for tuning.', 'Metric fixtures verify window boundaries, censoring, repeated alerts, unavailable gaps and denominator handling.', 'Missing metrics are null/Not evaluated; zero-event cases do not divide by zero or imply success.', 'Report weaker AI results if observed and describe correlated windows/few-event limitations.'],
    ['Frozen artifact hashes, held-out report/export, metric tests and reproducible command.'])

add('reliability', 'Verify deterministic replay, leakage, missing sensors and process restart', 'D', 'P0', '1–2', ['integration'], '6–10, 13',
    ['Run AC02 identical seed/config/model replay and compare readings/predictions/alerts excluding separately documented wall-clock-only fields.', 'Run AC03 future-reading perturbation, AC04 missing-sensor/fresh-score checks, AC05 real process restart at saved position and near cooldown/candidate transition boundaries.', 'Verify non-monotonic/duplicate ingestion, atomic rollback, resumed run and no duplicate alerts.'],
    ['AC02–AC05 have repeatable tests, commands and recorded results.', 'Restart preserves original warnings, counters, acknowledgment and trajectory position.', 'Failures remain open and block release; no acceptance box checked without evidence.'],
    ['Test logs and replay/restart output comparisons tied to commit/model/config.'])

add('offline_mobile', 'Rehearse offline cold start, phone layout and clean installation', 'D', 'P0', '1–2', ['integration', 'scaffold'], '2, 4, 12–13',
    ['Verify internet-disabled process restart and browser reload, local inference and assets; bundled audio only if included.', 'Test 360 px/laptop width, touch/keyboard, text/icons, disconnected timestamps, validation/loading/empty states.', 'Have a teammate launch from README in a fresh environment; record exact commands/version and dependency installation versus offline runtime boundary.', 'If claiming phone operation, test actual phone on actual demo LAN with explicit 0.0.0.0 binding; document localhost default, laptop dependency and no public exposure.'],
    ['AC08, AC09, AC14 have direct observed evidence, not only unit tests.', 'AC10 passes on actual hardware/network or phone operation is explicitly unclaimed; do not invent successful device tests.', 'README commands work from clean checkout; no external fonts/scripts/Swagger assets are requested.'],
    ['Offline recording, clean-install log, browser/network inspection and actual device checklist when applicable.'])

add('release', 'Complete AC01–AC14 evidence gate, claims review and submission rehearsal', 'D', 'P0', '1–2', ['coordination', 'evaluation', 'reliability', 'offline_mobile'], '13–16',
    ['Map all AC01–AC14 to evidence and responsible reviewer; verify model parity/performance and registration evidence alongside integration checks.', 'Review every UI/readme/demo claim: SYNTHETIC_DEMO, probability null, no farm-loss/food-safety/solar/real-SMS/microcontroller claims.', 'Freeze features and record backup demo covering registration, heat replay, trained model, operator alert, internet disconnect, missing sensor and baseline results.', 'Use confirmed organizer format/deadline and prior-work disclosure for submission pack; obtain any required human submission action.'],
    ['All required release checks have links/results; failed checks are explicit blockers, not silently waived.', 'Trained local model and full workflow are present; threshold-only integration is not labeled final.', 'Submission pack follows verified brief and recording length; eligibility/deadline unknowns remain blockers until resolved.'],
    ['Signed-off acceptance matrix, commit/model hashes, backup recording and final claims checklist.'])

add('audio', 'Optional: add reviewed bundled local-language alert audio', 'C', 'P1', '0.5–1', ['ui_sim'], '4, 12, 14',
    ['Confirm language and reviewer; obtain reviewed recordings with permission and bundle locally.', 'Require user sound opt-in and keep text visible; no online speech service.'],
    ['Reviewed transcript matches message meaning and correct state.', 'Audio works after offline reload and disabled sound preserves full text.'], ['Reviewer/language record and offline playback check.'])

add('baseline_plus', 'Optional: evaluate age/exposure comparator', 'A', 'P1', '0.5–1', ['evaluation'], '11, 14',
    ['Add age/exposure baseline tuned on validation only; retain the frozen mandatory comparator and same held-out histories/timing.'],
    ['Report comparable metrics without test-driven retuning or superiority claims unsupported by evidence.'], ['Config and reproducible extended comparison.'])

add('economics', 'Deferred: transparent economic scenario calculator', 'C', 'P2', '1–2', ['release'], '11, 14',
    ['Only after P0 release work: show explicit saleable quantity, achieved price and intervention costs with net proceeds/comparator arithmetic.', 'Label all inputs assumptions; do not derive kilograms saved from model accuracy.'],
    ['Specification illustrative $35 versus $40 scenario yields hypothetical $5 benefit with assumptions displayed.', 'Never presented as measured farmer benefit.'], ['Arithmetic checks and labeled screenshot.'])

add('interventions', 'Deferred: reproducible intervention branches', 'A', 'P2', '2–3', ['release'], '10–11, 14',
    ['Only after P0 release work: define reviewed explicit intervention-effect assumptions and counterfactual branches using identical underlying random disturbances.', 'Keep action logging behavior intact unless branch behavior is explicitly selected.'],
    ['Comparator/intervention differ only by declared intervention assumptions.', 'Results remain hypothetical; no claims of field effectiveness.'], ['Paired-run reproducibility checks and documented assumptions.'])

def body(task, links=None):
    def ref(k):
        return links[k]['url'] if links else f'`{k}` (issue link added on publication)'
    deps = '\n'.join(f'- Blocked by {ref(k)}' for k in task['deps']) or '- None. Ready for a teammate to claim.'
    return f'''## Context
Implement specification sections {task['sections']}: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role {task['role']}; named assignee not yet confirmed.
- Priority: {task['priority']}
- Planning estimate: {task['estimate']} focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `{task['key']}`

## Dependencies
{deps}

## Scope and implementation notes
''' + '\n'.join('- '+s for s in task['scope']) + '''

## Acceptance criteria
''' + '\n'.join('- [ ] '+s for s in task['criteria']) + '''

## Required evidence
''' + '\n'.join('- '+s for s in task['evidence']) + '''

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
'''

if __name__ == '__main__':
    out = ROOT / 'docs/planning/issues'
    out.mkdir(parents=True, exist_ok=True)
    for i, task in enumerate(TASKS, 1):
        (out / f'{i:02d}-{task["key"]}.md').write_text(body(task))
    (ROOT / 'docs/planning/backlog.json').write_text(json.dumps(TASKS, indent=2)+'\n')
    print(f'Prepared {len(TASKS)} issues.')
