"""Check web/contract.json, the message files and the shared fixtures against Spec v2.

The expected feature order, input values, message keys and band wording are read from the
spec markdown itself, so this test holds no second copy of them that could drift.
"""
import hashlib
import json
import re
from pathlib import Path

import pytest

from model.tree_format import validate_tree

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / 'tests/fixtures'
SPEC = (ROOT / 'docs/SankofaFresh_Spec_v2.md').read_text()
CATEGORICAL_ENCODING = re.compile(r'\d+ \w+(, \d+ \w+)*')
SHORT_KEY_PREFIXES = ('question_', 'option_', 'button_', 'record_', 'title_', 'error_', 'evidence_', 'source_', 'metric_')
SHORT_KEYS = ('sms_not_sent', 'demo_model_note', 'demo_data_note')
SHORT_MAX_CHARACTERS = 40
DRAFT_STATUS = 'UNREVIEWED DRAFT, machine-written, not for release'


def load(relative_path):
    return json.loads((ROOT / relative_path).read_text())


CONTRACT = load('web/contract.json')
LANGUAGES = CONTRACT['languages']
MESSAGE_FILES = {code: load(f'web/messages.{code}.json') for code in LANGUAGES}
MESSAGES = MESSAGE_FILES['en']
FEATURE_NAMES = [f['name'] for f in CONTRACT['features']]
INPUTS = {i['name']: i for i in CONTRACT['inputs']}


def spec_section(start_heading, end_heading):
    start = SPEC.index(start_heading)
    return SPEC[start:SPEC.index(end_heading, start)]


def table_rows(section):
    """Body rows of the first markdown table in a section, as lists of stripped cells."""
    lines = [line for line in section.splitlines() if line.startswith('|')]
    return [[cell.strip() for cell in line.strip().strip('|').split('|')] for line in lines[2:]]


def humidity_baseline(features):
    # Spec section 7: red if rh14_mean is above 80 percent, otherwise green.
    return 'red' if features[FEATURE_NAMES.index('rh14_mean')] > 80 else 'green'


def tree_hash(nodes):
    return hashlib.sha256(json.dumps(nodes, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def check_tree(tree):
    validate_tree(tree)


def test_contract_loads_with_every_section():
    assert set(CONTRACT) == {'schema_version', 'evidence_mode', 'dont_know_value', 'inputs', 'weather_window',
                             'features', 'classes', 'bands', 'abstention', 'actions', 'recorded_actions',
                             'metrics', 'message_keys', 'message_placeholders', 'languages'}
    assert CONTRACT['schema_version'] == 2
    assert CONTRACT['evidence_mode'] == 'SYNTHETIC_DEMO'


def test_feature_order_and_encodings_match_spec():
    rows = table_rows(spec_section('### 5.2', '### 5.3'))
    assert [row[1] for row in rows] == FEATURE_NAMES
    assert [int(row[0]) for row in rows] == list(range(len(FEATURE_NAMES)))
    for (_, name, encoding), feature in zip(rows, CONTRACT['features']):
        if encoding == 'integer':
            assert (feature['source'], feature['encoding']) == ('input', 'integer'), name
        elif CATEGORICAL_ENCODING.fullmatch(encoding):
            expected = {label: int(number) for number, label in re.findall(r'(\d+) (\w+)', encoding)}
            assert feature['encoding'] == 'map' and feature['map'] == expected, name
        else:
            assert feature['source'] == 'weather' and feature['variable'] in encoding, name


def test_inputs_match_spec():
    rows = table_rows(spec_section('### 5.1', '### 5.2'))
    assert [row[0] for row in rows] == list(INPUTS)
    for name, values, _ in rows:
        field = INPUTS[name]
        if name == 'batch_label':
            assert field['type'] == 'choice' and field['values'][:2] == ['Batch 1', 'Batch 2']
            assert not field['allows_dont_know']
        elif values == 'date':
            assert field['type'] == 'date' and field['format'] == 'YYYY-MM-DD'
        elif re.fullmatch(r'\d+ to \d+', values):
            low, high = map(int, values.split(' to '))
            assert (field['type'], field['min'], field['max']) == ('integer', low, high), name
        else:
            options = values.split(', ')
            assert field['type'] == 'choice'
            assert field['values'] == [o for o in options if o != "don't know"], name
        if name != 'batch_label':
            # Spec section 3: every question in the check form has a "Don't know" option.
            assert field['allows_dont_know'], name


def test_contract_is_internally_consistent():
    assert len(INPUTS) == len(CONTRACT['inputs'])
    assert len(set(FEATURE_NAMES)) == len(FEATURE_NAMES)
    keys = set(CONTRACT['message_keys'])
    for feature in CONTRACT['features']:
        if feature['source'] == 'input':
            field = INPUTS[feature['input']]
            if feature['encoding'] == 'map':
                assert set(feature['map']) == set(field['values']), feature['name']
            else:
                assert field['type'] == 'integer', feature['name']
        assert feature['reason'] is None or feature['reason'] in keys
    band_names = [band['name'] for band in CONTRACT['bands']]
    assert band_names == CONTRACT['classes'] + [CONTRACT['abstention']['band']]
    assert all(band['message'] in keys for band in CONTRACT['bands'])
    assert [rule['id'] for rule in CONTRACT['abstention']['rules']] == ['dont_know', 'out_of_range', 'low_confidence']
    assert all(rule['reason'] in keys for rule in CONTRACT['abstention']['rules'])
    assert set(CONTRACT['message_placeholders']) <= keys
    window = CONTRACT['weather_window']
    assert window['days'] == 14
    assert INPUTS[window['start_input']]['type'] == 'date' and INPUTS[window['days_input']]['type'] == 'integer'
    for feature in CONTRACT['features']:
        if feature['source'] == 'weather':
            assert feature['variable'] in window['columns'] and feature['aggregate'] in ('mean', 'max'), feature['name']
    assert len(set(CONTRACT['recorded_actions'])) == len(CONTRACT['recorded_actions'])
    assert len(set(CONTRACT['message_keys'])) == len(CONTRACT['message_keys'])


def test_days_drying_has_the_short_drying_reason():
    days_drying = next(f for f in CONTRACT['features'] if f['name'] == 'days_drying')
    assert (days_drying['reason'], days_drying['risk']) == ('reason_short_drying', 'lower')


def test_every_feature_with_a_reason_has_a_risk_direction():
    for feature in CONTRACT['features']:
        if feature['reason'] is None:
            assert feature['risk'] is None, feature['name']
        else:
            assert feature['risk'] in ('higher', 'lower'), feature['name']


def test_metric_keys_match_the_metrics_list():
    assert {f'metric_{name}' for name in CONTRACT['metrics']} == {k for k in CONTRACT['message_keys'] if k.startswith('metric_')}


def pick_action(band, reasons):
    """Spec 5.6: the first reason picks the action when mapped, otherwise the band default."""
    actions = CONTRACT['actions']
    if reasons and reasons[0] in actions['reason_action']:
        return actions['reason_action'][reasons[0]]
    return actions['band_default'][band]


def test_action_rule_is_well_formed():
    actions = CONTRACT['actions']
    keys = set(CONTRACT['message_keys'])
    reason_keys = {k for k in keys if k.startswith('reason_')}
    abstention_reasons = {rule['reason'] for rule in CONTRACT['abstention']['rules']}
    assert set(actions['reason_action']) <= reason_keys - abstention_reasons
    assert set(actions['reason_action'].values()) <= {k for k in keys if k.startswith('action_')}
    assert set(actions['band_default']) == {band['name'] for band in CONTRACT['bands']}
    assert actions['band_default']['green'] is None
    assert {v for v in actions['band_default'].values() if v} <= keys
    used = set(actions['reason_action'].values()) | {v for v in actions['band_default'].values() if v}
    assert used == {k for k in keys if k.startswith('action_')}, 'every action message is reachable'


@pytest.mark.parametrize('band, reasons, action', [
    ('red', ['reason_rewetted', 'reason_floor'], 'action_redry'),
    ('amber', ['reason_damp_check'], 'action_redry'),
    ('amber', ['reason_short_drying'], 'action_redry'),
    ('red', ['reason_floor', 'reason_rewetted'], 'action_raise_bags'),
    ('amber', ['reason_humid_weeks', 'reason_rewetted'], 'action_test_sample'),
    ('red', ['reason_musty'], 'action_test_sample'),
    ('red', [], 'action_test_sample'),
    ('not_sure', ['reason_missing_input'], 'action_test_sample'),
    ('not_sure', ['reason_low_confidence'], 'action_test_sample'),
    ('green', [], None)])
def test_action_rule_picks_the_specified_action(band, reasons, action):
    assert pick_action(band, reasons) == action


def test_interface_keys_follow_contract_patterns():
    keys = set(CONTRACT['message_keys'])
    assert {f'question_{name}' for name in INPUTS} <= keys
    choice_values = {v for field in CONTRACT['inputs'] if field['type'] == 'choice' and field['name'] != 'batch_label'
                     for v in field['values']}
    assert {f'option_{v}' for v in choice_values} | {'option_dont_know'} == {k for k in keys if k.startswith('option_')}
    assert {f'record_{v}' for v in CONTRACT['recorded_actions']} == {k for k in keys if k.startswith('record_')}
    assert {'weather_note', 'not_evaluated', 'language_name', 'confirm_delete_all'} <= keys


def is_short_key(key):
    return key.startswith(SHORT_KEY_PREFIXES) or key in SHORT_KEYS


@pytest.mark.parametrize('code', LANGUAGES)
def test_short_strings_fit_a_phone_screen(code):
    for key, text in MESSAGE_FILES[code].items():
        if is_short_key(key):
            assert len(text) <= SHORT_MAX_CHARACTERS, (code, key, len(text))


def test_languages_are_listed_once_with_a_default():
    assert LANGUAGES and len(set(LANGUAGES)) == len(LANGUAGES)
    assert all(re.fullmatch(r'[a-z]{2,3}', code) for code in LANGUAGES)


def test_contract_message_keys_match_spec():
    spec_keys = re.findall(r'`([a-z][a-z0-9_]*)`', spec_section('### 5.5', '### 5.6'))
    assert 'band_green' in spec_keys and 'metric_coverage' in spec_keys, 'spec 5.5 key list did not parse'
    assert CONTRACT['message_keys'] == spec_keys


@pytest.mark.parametrize('code', LANGUAGES)
def test_every_listed_language_has_every_key_and_no_draft_status(code):
    messages = MESSAGE_FILES[code]
    assert '_status' not in messages, f'messages.{code}.json is still marked as a draft'
    assert set(messages) == set(CONTRACT['message_keys']), code
    for key, text in messages.items():
        assert isinstance(text, str) and text and text == text.strip(), (code, key)


def test_band_messages_use_spec_wording():
    rows = table_rows(spec_section('## 1.', '### Why this fits'))
    assert {f'band_{band}': meaning for band, meaning in rows} == {
        key: MESSAGES[key] for key in MESSAGES if key.startswith('band_')}


def check_placeholders(messages):
    for key in CONTRACT['message_keys']:
        text = messages[key]
        assert re.findall(r'\{(\w+)\}', text) == CONTRACT['message_placeholders'].get(key, []), key
        assert text.count('{') == text.count('}') == len(CONTRACT['message_placeholders'].get(key, [])), key
    assert 'SYNTHETIC_DEMO' in messages['synthetic_label']
    # Spec section 2: the SMS draft is labelled SIMULATED_NOT_SENT in every language.
    assert 'SIMULATED_NOT_SENT' in messages['sms_not_sent']


@pytest.mark.parametrize('code', LANGUAGES)
def test_message_placeholders_are_declared(code):
    check_placeholders(MESSAGE_FILES[code])


def test_twi_draft_is_complete_and_unlisted():
    draft = load('web/messages.tw.draft.json')
    assert draft['_status'] == DRAFT_STATUS
    assert 'tw' not in LANGUAGES, 'review the draft and rename it to messages.tw.json before listing tw'
    assert set(draft) - {'_status'} == set(CONTRACT['message_keys'])
    check_placeholders(draft)


def test_canonical_fixture_matches_python():
    fixture = load('tests/fixtures/canonical_nodes.json')
    assert fixture['canonical'] == json.dumps(fixture['nodes'], sort_keys=True, separators=(',', ':'))
    assert fixture['sha256'] == tree_hash(fixture['nodes'])
    assert all(repr(number) == text for number, text in fixture['float_reprs'])


def check_cases(fixture):
    """Fixture structure; tests/test_encode.py checks the expected values against the encoders."""
    assert (FIXTURES / fixture['weather_table']).is_file()
    for case in fixture['cases']:
        assert set(case) == {'id', 'description', 'spec_expectation', 'inputs', 'expected'}, case['id']
        assert set(case['inputs']) == set(INPUTS), case['id']
        expected = case['expected']
        assert set(expected) == {'abstain_reason', 'features', 'baseline_band'}, case['id']
        if expected['abstain_reason'] is None:
            assert len(expected['features']) == len(FEATURE_NAMES), case['id']
            assert expected['baseline_band'] == humidity_baseline(expected['features']), case['id']
        else:
            assert expected['features'] is None and expected['baseline_band'] is None, case['id']
    assert len({case['id'] for case in fixture['cases']}) == len(fixture['cases'])


def test_demo_batches_fixture():
    fixture = load('tests/fixtures/demo_batches.json')
    check_cases(fixture)
    cases = {case['id']: case for case in fixture['cases']}
    assert list(cases) == ['clearly_safe', 'rewetted_dry_weeks', 'missing_input']
    assert cases['rewetted_dry_weeks']['inputs']['rewetted'] == 'yes'
    assert cases['rewetted_dry_weeks']['expected']['baseline_band'] == 'green'
    assert cases['missing_input']['expected']['abstain_reason'] == 'reason_missing_input'


def test_out_of_range_fixture():
    fixture = load('tests/fixtures/out_of_range.json')
    check_cases(fixture)
    assert [case['expected']['abstain_reason'] for case in fixture['cases']] == ['reason_out_of_range']


def test_sample_tree_fixture():
    tree = load('tests/fixtures/sample_tree.json')
    check_tree(tree)
    leaves = [node for node in tree['nodes'] if 'value' in node]
    assert (len(tree['nodes']), len(leaves)) == (3, 2), 'one split and two leaves'
    # The demo batches must sit inside the sample ranges so they can run through the sample tree.
    for case in load('tests/fixtures/demo_batches.json')['cases']:
        if case['expected']['features'] is not None:
            for name, value in zip(FEATURE_NAMES, case['expected']['features']):
                low, high = tree['feature_ranges'][name]
                assert low <= value <= high, (case['id'], name)


def test_tree_check_rejects_a_tampered_tree():
    tree = load('tests/fixtures/sample_tree.json')
    tree['nodes'][2]['value'] = [0.1, 0.2, 0.7]
    with pytest.raises(ValueError, match='sha256'):
        check_tree(tree)
