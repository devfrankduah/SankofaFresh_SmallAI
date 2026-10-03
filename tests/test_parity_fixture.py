"""tests/fixtures/parity_cases.json must be exactly what scikit-learn says for the committed tree, so the JS
parity test (tests/test_parity.mjs) compares tree.js against current truth, not a stale copy."""
import json
from pathlib import Path

from model.parity import FIXTURE_PATH, build, to_text

TREE = json.loads((Path(__file__).resolve().parents[1] / 'web' / 'tree.json').read_text())


def test_parity_fixture_is_current():
    assert FIXTURE_PATH.read_text() == to_text(build()), 'run python -m model.parity'


def test_parity_fixture_covers_every_split_and_held_out_row():
    fixture = json.loads(FIXTURE_PATH.read_text())
    splits = [node['id'] for node in TREE['nodes'] if 'value' not in node]
    assert sorted({case['node'] for case in fixture['boundary']}) == splits
    assert all(case['reaches_node'] for case in fixture['boundary'])
    assert len(fixture['held_out']) == 2880
