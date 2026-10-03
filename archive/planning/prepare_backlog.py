"""Generate reviewable Spec v2 issue bodies. No network calls or application implementation."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ISSUES_DIR = ROOT / 'archive/planning/issues'
# The one place the repository is named; the publish, sync and verify scripts import it.
REPO_OWNER, REPO_NAME = 'devfrankduah', 'SankofaFresh_SmallAI'
REPO = f'{REPO_OWNER}/{REPO_NAME}'
REPO_URL = f'https://github.com/{REPO}'
# Issue bodies written before the repository moved still link here; GitHub redirects these links.
LEGACY_REPO_URL = 'https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI'
SPEC_URL = f'{REPO_URL}/blob/main/docs/SankofaFresh_Spec_v2.md'
OPEN = 'open'
CLOSED_NOT_PLANNED = 'closed_not_planned'
NOT_PLANNED_COMMENT = ('Closed as not planned under Spec v2 (docs/SankofaFresh_Spec_v2.md). v2 removes the server API, '
                       'the extra comparator and the economic and intervention work.')
TASKS = []

def add(key, number, title, priority, hours, deps, sections, scope, criteria, evidence):
    TASKS.append(dict(key=key, number=number, status=OPEN, title=title, priority=priority,
                      estimate=hours, deps=deps, sections=sections, scope=scope,
                      criteria=criteria, evidence=evidence))

# The title stays the v1 one: closed issues keep their v1 title and body on GitHub.
def close_not_planned(key, number, title):
    TASKS.append(dict(key=key, number=number, status=CLOSED_NOT_PLANNED, title=title, priority=None,
                      estimate=None, deps=[], sections=None, scope=[], criteria=[], evidence=[]))

add('coordination', 1, 'Confirm deadline, submission format, language, demo location and repo visibility', 'P0', '0.5 to 1', [], '13',
    ['Confirm in the Hack-Nation workspace: the exact deadline and timezone, the submission form fields, and whether the form wants one video or three.',
     'Choose the local language and the demo location together so they match: a language the team can verify tonight, spoken in a coffee-growing location. Check the coordinates on a map before weather is fetched.',
     'Decide repository visibility for judges and the static host. Static hosting from a private repository may need a paid plan, so use a public repository or a separate static host.',
     'Record the prior concept disclosure: SankofaFresh existed as an idea before the event, and all code is written during the event window.'],
    ['Each answer is recorded in this issue with its source and time, or marked unresolved.',
     'Language and demo location are decided by the 14:30 ET checkpoint, with the checked coordinates recorded.',
     'No organizer approval is claimed that was not given.'],
    ['An issue comment listing each decision with its source (link or screenshot) and time, and any unresolved items.'])

add('contracts', 2, 'Freeze v2 contracts: inputs, features, abstention, tree.json and message keys', 'P0', '1 to 1.5', [], '5',
    ['Freeze spec 5.1 to 5.5 as `docs/contracts_v2.md`: app inputs, feature order and encoding, abstention rules, the tree.json schema and the message keys.',
     'Add JSON fixtures: three demo batches (clearly safe, rewetted in dry weeks, missing input), one out-of-range input, a two-node sample tree.json, and an English message file with every key.'],
    ['Feature order and encodings are identical in the contract, the fixtures and spec 5.2.',
     'Every message key from spec 5.5 is present in the English message file.',
     'The sample tree.json follows spec 5.4, including feature_ranges, classes, abstain_cut and sha256.',
     'The missing-input and out-of-range fixtures record not_sure as the expected result, with the reason key from spec 5.3.'],
    ['`docs/contracts_v2.md` and the fixture files in the PR, with a check that feature names and message keys match spec 5.'])

add('scaffold', 3, 'Scaffold v2 layout: data/, model/, tests/, web/, pinned tooling and CI', 'P0', '0.5 to 1', [], '8',
    ['Create the spec 8 layout: data/, model/, tests/, web/ and evidence/.',
     'Add `requirements.txt` pinning numpy, pandas, scikit-learn, requests and pytest for Python 3.11 or 3.12, and record the tested version.',
     'Update `.gitignore`. Add a CI workflow that runs pytest and the Node parity test (Node 18 or later) once they exist.',
     'No frontend framework and no build step.'],
    ['A clean virtual environment installs `requirements.txt`.',
     'CI runs on pull requests without secrets.',
     'No frontend framework, bundler or build step is introduced.'],
    ['Clean install log with the exact Python version, and a link to the first CI run.'])

add('device_records', 4, 'On-device batch records, consent screen and delete-all', 'P0', '1 to 1.5', ['contracts', 'scaffold'], '3, 11',
    ['localStorage wrapper for batches and recorded actions, with every read and write wrapped in try/catch so the app still runs when storage is blocked or empty.',
     'Consent screen on first run, in the local language: records stay on the phone, and nothing is sent unless the user sends the SMS themselves.',
     'Delete all records from settings.',
     'Store only the spec 5.1 inputs, results and recorded actions. No accounts, names, phone numbers or GPS.',
     'Recording an action (re-dried, moved off the floor, took a sample, sold, other) does not change the result.'],
    ['AC11: records stay on the device, the consent screen shows on first run, and delete clears everything.',
     'When localStorage throws, the app still loads and runs a check instead of failing.',
     'Saving or deleting records makes no network request.'],
    ['Manual check notes with screenshots: consent on first run, a saved batch after reload, and an empty list after delete-all.'])

add('weather', 5, 'Fetch and bundle NASA POWER weather for the demo location', 'P0', '1 to 1.5', ['scaffold'], '5.2, 10',
    ['`data/fetch_power.py`: NASA POWER hourly T2M and RH2M, community AG, with `--lat --lon --year`. Coordinates come from #1; the script must not hard-code them.',
     '`data/build_weather.py` writes `web/weather.json` with daily means and the 14-day features from spec 5.2 (rh14_mean, rh14_max, t14_mean).',
     'Record the request URL and the POWER citation in the README.'],
    ['`web/weather.json` is under 100 KB.',
     'Values fall in plausible ranges (RH2M within 0 to 100 percent, T2M plausible for the location).',
     'Coordinates and year come only from the command-line arguments.'],
    ['The fetch command and request URL, the weather.json size, and a summary of value ranges.'])

add('features', 6, 'Shared feature encoding and abstention rules in Python and JS', 'P0', '1 to 1.5', ['contracts', 'scaffold'], '5.2, 5.3',
    ['One encoding function in Python and one in JS that turn the spec 5.1 inputs and weather features into the nine-feature vector, in spec 5.2 order.',
     'Abstention rules 1 and 2 from spec 5.3: any "don\'t know" input, or any feature outside the training ranges stored in tree.json, returns not_sure with the reason.',
     'Both implementations run against the #2 fixtures.'],
    ['Python and JS produce identical vectors for every fixture.',
     'AC01 (inputs part): the missing-input and out-of-range fixtures return not_sure with reason_missing_input and reason_out_of_range.'],
    ['Python and JS test output on the fixtures.'])

close_not_planned('batch_api', 7, 'Implement batch, snapshot, action and acknowledgment APIs')

add('bands_baseline', 8, 'Result bands, not_sure band and humidity-only baseline', 'P0', '0.5 to 1', ['contracts'], '5.3, 7',
    ['Map class probabilities to green, amber and red.',
     'Apply the abstain cut (spec 5.3 rule 3, starting at 0.6 and tuned on validation only): a winning probability below the cut returns not_sure with reason_low_confidence.',
     'Implement the humidity-only baseline from spec 7 in Python for evaluation: red if rh14_mean is above 80 percent, otherwise green.',
     'No v1 hysteresis, cooldown or SQLite state.'],
    ['AC01: a winning probability below the abstain cut returns not_sure with a reason.',
     'A winning probability exactly at the cut returns the band, because the rule says below.',
     'The baseline returns green at rh14_mean exactly 80 and red just above it.'],
    ['Table-driven unit tests covering the bands, the cut boundary and the baseline boundary.'])

add('synthetic_data', 9, 'Generate seeded synthetic parchment batches with documented label rule and farm split', 'P0', '1.5 to 2', ['weather', 'features'], '6',
    ['`data/gen_batches.py` and `data/generator_config.json` exactly as spec 6, every parameter carrying a `source` field (a citation or ASSUMPTION).',
     'Group batches into synthetic farms and split 60/20/20 by farm, never by row, plus a season-held-out stress set.',
     'Write a manifest with the seed and the counts per class and split.',
     'No "don\'t know" values in the training data.'],
    ['AC02 (data part): the same seed and config produce a byte-identical dataset.',
     'AC03: no farm appears in more than one split.',
     'Every parameter in `generator_config.json` has a `source` field.',
     'The dataset is labelled SYNTHETIC_DEMO and is never described as field data.'],
    ['The manifest, the dataset hash from two runs with the same seed, and the leakage check output.'])

add('train_export', 10, 'Train depth-4 tree and export tree.json', 'P0', '1 to 1.5', ['synthetic_data'], '5.4, 6',
    ['`model/train.py`: DecisionTreeClassifier(max_depth=4, class_weight="balanced") on the training farms.',
     'Tune the abstain cut on validation only; test farms are never used for tuning.',
     'Export `web/tree.json` per spec 5.4 with feature ranges, model_version and the sha256 of the canonical nodes array.'],
    ['AC05 (tree part): tree.json is under 250 KB.',
     'tree.json follows spec 5.4 and its sha256 matches the canonical nodes array.',
     'Retraining on the same data gives the same tree hash.'],
    ['Training command and log, tree.json size and hash, and the chosen abstain cut with the validation numbers behind it.'])

add('inference', 11, 'JS tree interpreter with Python and Node parity and size check', 'P0', '1.5 to 2', ['train_export', 'features'], '5.4',
    ['`web/tree.js` interpreter: cast inputs with `Math.fround` and go left when the value is less than or equal to the float32 threshold, as scikit-learn does. Return class probabilities and the decision path.',
     '`tests/test_parity.mjs`: Node runs tree.js on every held-out row plus threshold boundary cases and must match Python exactly.',
     '`tests/test_size.py`: tree.json under 250 KB, and a report of total web/ size.'],
    ['AC04: Python and JS predictions match on all held-out rows, including threshold boundaries.',
     'AC05: tree.json is under 250 KB and the total app size is measured and reported.',
     'tree.js makes no network calls.'],
    ['Parity test output with row counts, and the size report.'])

add('pwa_screens', 12, 'PWA screens: batch list, tap-only check form and result view at 360 px', 'P0', '2 to 3', ['contracts', 'scaffold'], '3, 4',
    ['Batch list with each batch\'s last band, the date of the last check and an Add batch button.',
     'Tap-only check form for the spec 5.1 questions, with "Don\'t know" on every question and no typing.',
     'Result screen shell and settings.',
     'Build against the #2 fixtures so the screens work before the model exists. No external fonts, scripts or CDNs.'],
    ['AC08: no horizontal scroll at 360 px, tap targets at least 44 by 44 CSS pixels, and status shown with text and an icon, never colour alone.',
     'Every spec 5.1 question is answerable by tapping and has a "Don\'t know" option.',
     'All screens render from the #2 fixtures with no model present.'],
    ['360 px screenshots of each screen and the AC08 checklist.'])

add('result_view', 13, 'Result view: local-language message, reasons, audio, SMS draft and evidence screen', 'P0', '1.5 to 2', ['pwa_screens', 'messages'], '4, 5.5',
    ['Render the band with icon and text, up to two reasons from the decision path, one action, a Play audio button when clips exist, and the SYNTHETIC_DEMO label.',
     'SMS draft labelled SIMULATED_NOT_SENT with a copy button. The app never sends it.',
     'Evidence screen reading evidence/metrics.json: model version, tree hash, file sizes, held-out metrics against the baseline and data sources. It shows "Not evaluated" when metrics are absent, never zero.'],
    ['AC09: every string on the result comes from the fixed message files; nothing is generated at runtime.',
     'AC12: SYNTHETIC_DEMO is visible on every result and on the evidence screen, with no claims of field accuracy, food safety or income gains.',
     'With metrics.json absent, the evidence screen shows "Not evaluated".',
     'Reasons describe what the tree used, not a proven cause.'],
    ['Screenshots of each band, a not_sure result, the SMS draft, and the evidence screen with and without metrics.'])

add('offline_flow', 14, 'End-to-end offline flow on a real phone', 'P0', '1.5 to 2', ['inference', 'result_view', 'device_records', 'bands_baseline', 'weather'], '3',
    ['Wire the form, features, tree, bands, messages and records together.',
     'Run the three demo batches end to end on a real phone: clearly safe, rewetted in dry weeks, and missing input.',
     'This is the 19:00 ET team checkpoint.'],
    ['AC01: the missing-input batch returns not_sure with a reason in the full app.',
     'AC06 (first pass): after one online load, a check completes in airplane mode on a real phone.',
     'Saved results appear in the batch list after a reload.'],
    ['Screen recording of the three batches on the phone, with the phone model and browser noted.'])

add('evaluation', 15, 'Held-out evaluation: tree against humidity baseline', 'P0', '1 to 1.5', ['train_export', 'bands_baseline', 'synthetic_data'], '7',
    ['Run the tree and the humidity-only baseline on the same held-out farms.',
     'Report accuracy, macro F1, red recall, false reassurance rate (true red predicted green), abstain rate and coverage in evidence/metrics.json.',
     'Include the rewetted-in-dry-weeks case and the season-held-out stress set.',
     'Report weaker tree results honestly. All metrics are labelled as results on synthetic labels.'],
    ['AC10: tree and baseline are compared on the same held-out farms with every spec 7 metric.',
     'Test farms are not used for any tuning.',
     'Nothing presents the metrics as field accuracy.'],
    ['evidence/metrics.json and the command that produced it.'])

add('test_gate', 16, 'Test gate: leakage, determinism, parity and size', 'P0', '1 to 1.5', ['inference', 'synthetic_data'], '9',
    ['Leakage, determinism, parity and size tests all run in CI: test_leakage, test_determinism, test_parity and test_size.'],
    ['AC02: the same seed gives an identical dataset and tree hash.',
     'AC03: no farm appears in more than one split.',
     'AC04: Python and JS predictions match on all held-out rows, including threshold boundaries.',
     'AC05: tree.json is under 250 KB and the total app size is reported.',
     'All four tests pass in CI.'],
    ['A link to a passing CI run that names the four tests.'])

add('deploy_offline', 17, 'Deploy the static app and verify airplane-mode reload on a real phone', 'P0', '1 to 1.5', ['offline_flow'], '4, 9',
    ['Service worker pre-caches every file the app needs.',
     'Deploy to the static host chosen in #1.',
     'Open the app once online, switch to airplane mode, reload and run a check. Record it.',
     'Fill `evidence/offline-check.md` and save the browser network log.'],
    ['AC06: after one online load, the app works in airplane mode on a real phone, including a reload.',
     'AC07: no network requests at runtime after install.',
     'Done by the 23:00 ET checkpoint.'],
    ['Screen recording, evidence/offline-check.md, the network log and the deployed URL.'])

add('release', 18, 'README, data limits, Responsible AI section and submission', 'P0', '1.5 to 2', ['coordination', 'evaluation', 'test_gate', 'deploy_offline', 'video'], '10 to 12',
    ['README: problem sentence, how to run and test offline, dataset table, data limits list (spec 10), tree paths, metrics, Responsible AI (spec 11), claims (spec 12) and licences.',
     'Claims review across the app, the README and the video.',
     'Submit using the format confirmed in #1, by the 08:30 ET checkpoint.'],
    ['AC12: SYNTHETIC_DEMO on every result, and no claims of field accuracy, food safety or income gains anywhere.',
     'AC13: a teammate regenerates data, retrains and runs the app from the README on a clean checkout.',
     'Every row in docs/ACCEPTANCE.md links its evidence or stays NOT VERIFIED as an explicit gap.'],
    ['Clean-run log, the completed docs/ACCEPTANCE.md, the claims checklist and the submission confirmation.'])

add('messages', 19, 'Local-language message set (text required, audio optional)', 'P0', '1 to 2', ['contracts', 'coordination'], '5.5',
    ['Write every spec 5.5 key in English and in the chosen language, in `web/messages.en.json` and `web/messages.<lang>.json`.',
     'A fluent speaker checks every local-language message.',
     'Optional audio: one short clip per key, generated at build time or recorded by a person, and checked by ear. Record the source and licence of each clip (Meta MMS-TTS is CC-BY-NC 4.0). Ship audio files only, never a speech model.',
     'If audio isn\'t working by 21:00 ET, ship text only.'],
    ['AC09: every message exists in both languages and the local-language set is checked by a fluent speaker.',
     'Both message files have exactly the same keys.',
     'If audio ships, every clip has a recorded source and licence and plays offline.'],
    ['Both message files, the reviewer note, and the per-clip source and licence list if audio ships.'])

close_not_planned('baseline_plus', 20, 'Optional: evaluate age/exposure comparator')
close_not_planned('economics', 21, 'Deferred: transparent economic scenario calculator')
close_not_planned('interventions', 22, 'Deferred: reproducible intervention branches')

add('video', None, 'Record the 2 to 5 minute submission video', 'P0', '2 to 3', ['offline_flow', 'evaluation'], '1, 7, 11',
    ['Script and record one 2 to 5 minute video covering the five required parts: the problem sentence; the AI and why a simpler tool would not do the same job, with its guardrails; the demo (airplane mode, the three demo batches, the not_sure moment and the SMS draft); where it sits in the user\'s week, plus the tech stack; and the team\'s take on localizing AI.',
     'Export short cuts if the submission form asks for more than one video.',
     'Rough cut by the 05:00 ET checkpoint.'],
    ['The video runs 2 to 5 minutes and covers all five required parts.',
     'The demo shows airplane mode, the three demo batches, a not_sure result and the SMS draft.',
     'It states the data limits from spec 10, labels metrics as synthetic, and makes no claim that spec 12 rules out.'],
    ['The exported video file or link, the script, and timestamps for each of the five parts.'])

def open_tasks():
    return [t for t in TASKS if t['status'] == OPEN]

def closed_tasks():
    return [t for t in TASKS if t['status'] == CLOSED_NOT_PLANNED]

def validate_tasks():
    """Reject malformed TASKS before anything renders or touches GitHub."""
    by_key = {}
    for task in TASKS:
        if task['key'] in by_key:
            raise ValueError(f'duplicate task key {task["key"]}')
        by_key[task['key']] = task
    numbers = [t['number'] for t in TASKS if t['number'] is not None]
    if len(numbers) != len(set(numbers)):
        raise ValueError('duplicate issue numbers in TASKS')
    for task in TASKS:
        if task['status'] not in (OPEN, CLOSED_NOT_PLANNED):
            raise ValueError(f'{task["key"]}: unknown status {task["status"]}')
        if task['status'] == OPEN and task['priority'] not in ('P0', 'P1', 'P2'):
            raise ValueError(f'{task["key"]}: unknown priority {task["priority"]}')
        if task['status'] == CLOSED_NOT_PLANNED and task['number'] is None:
            raise ValueError(f'{task["key"]}: only an existing issue can be closed')
        for dep in task['deps']:
            if by_key.get(dep, {}).get('status') != OPEN:
                raise ValueError(f'{task["key"]} is blocked by {dep}, which is not an open task')
    visiting, done = set(), set()
    def visit(key, path):
        if key in done:
            return
        if key in visiting:
            raise ValueError('dependency cycle: ' + ' -> '.join(path + [key]))
        visiting.add(key)
        for dep in by_key[key]['deps']:
            visit(dep, path + [key])
        visiting.discard(key)
        done.add(key)
    for key in by_key:
        visit(key, [])
    text = json.dumps(TASKS, ensure_ascii=False)
    if '\u2013' in text or '\u2014' in text:
        raise ValueError('TASKS contain an en or em dash; write ranges as "2 to 5"')

def body(task, links=None):
    if task['status'] != OPEN:
        raise ValueError(f'{task["key"]} is {task["status"]}; its GitHub body is not regenerated')
    def ref(k):
        return links[k]['url'] if links and k in links else f'`{k}` (issue link added on publication)'
    deps = '\n'.join(f'- Blocked by {ref(k)}' for k in task['deps']) or '- None. Either teammate can start.'
    return f'''## Context
Specification sections {task['sections']}: [docs/SankofaFresh_Spec_v2.md]({SPEC_URL}). This is planned work, not verified behavior.

## Priority
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

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
'''

def write_issue_files(links):
    """Replace every file in archive/planning/issues with the open v2 bodies, named by issue number."""
    unpublished = [t['key'] for t in open_tasks() if t['key'] not in links]
    if unpublished:
        raise ValueError(f'tasks without a published issue: {unpublished}')
    ISSUES_DIR.mkdir(parents=True, exist_ok=True)
    for old in ISSUES_DIR.glob('*.md'):
        old.unlink()
    for task in open_tasks():
        (ISSUES_DIR / f'{links[task["key"]]["number"]:02d}-{task["key"]}.md').write_text(body(task, links))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--show', action='store_true', help='print every rendered body in full')
    args = parser.parse_args()
    validate_tasks()
    published = ROOT / 'archive/planning/published.json'
    links = json.loads(published.read_text())['issues'] if published.exists() else None
    for task in open_tasks():
        rendered = body(task, links)
        number = f'#{links[task["key"]]["number"]}' if links and task['key'] in links else 'new'
        print(f'{number:>4}  {task["key"]:<15} {task["priority"]}  {len(rendered.splitlines()):>2} lines  {task["title"]}')
        if args.show:
            print(rendered)
    for task in closed_tasks():
        print(f'{"#" + str(task["number"]):>4}  {task["key"]:<15} closed as not planned')
    (ROOT / 'archive/planning/backlog.json').write_text(json.dumps(TASKS, indent=2)+'\n')
    print(f'Rendered {len(open_tasks())} open issue bodies; {len(closed_tasks())} issues close as not planned. Wrote backlog.json.')
