"""model/evaluate.py: AC10, the tree and the baseline on the same held-out farms, and web/metrics.json for the app."""
import json
from pathlib import Path

import pytest

from model.contract import CONTRACT
from model.evaluate import build, metrics

ROOT = Path(__file__).resolve().parents[1]
TREE = json.loads((ROOT / 'web' / 'tree.json').read_text())
WEB_METRICS = json.loads((ROOT / 'web' / 'metrics.json').read_text())
DETAIL = json.loads((ROOT / 'evidence' / 'metrics.json').read_text())


def test_committed_outputs_are_what_the_evaluation_produces():
    for path, text in build().items():
        assert path.read_text() == text, f'{path} is stale: run python -m model.evaluate'


def test_web_metrics_has_the_contract_shape_and_matches_the_tree():
    assert set(WEB_METRICS) == {'model_version', 'tree_sha256', 'tree', 'baseline'}
    assert (WEB_METRICS['model_version'], WEB_METRICS['tree_sha256']) == (TREE['model_version'], TREE['sha256'])
    for who in ('tree', 'baseline'):
        assert list(WEB_METRICS[who]) == CONTRACT['metrics']
        assert all(value is None or 0 <= value <= 1 for value in WEB_METRICS[who].values())


def test_tree_and_baseline_use_the_same_batches():
    for split in DETAIL['splits'].values():
        for who in ('tree_confusion', 'baseline_confusion'):
            assert sum(sum(row.values()) for row in split[who].values()) == split['rows']


def test_baseline_never_abstains_or_says_amber():
    for split in DETAIL['splits'].values():
        assert split['baseline']['coverage'] == 1 and split['baseline']['abstain_rate'] == 0
        assert all(row['amber'] == 0 and row['not_sure'] == 0 for row in split['baseline_confusion'].values())


def test_metric_definitions_on_a_hand_example():
    result = metrics(['red', 'red', 'green', 'amber'], ['green', 'not_sure', 'green', 'amber'])
    assert result['coverage'] == 0.75 and result['abstain_rate'] == 0.25
    assert result['accuracy'] == pytest.approx(2 / 3)
    assert result['red_recall'] == 0 and result['false_reassurance_rate'] == 0.5


def test_demo_batches_show_the_three_spec_cases():
    batches = {b['id']: b for b in json.loads((ROOT / 'evidence' / 'demo_batches.json').read_text())['batches']}
    assert batches['clearly_safe']['tree'] == 'green'
    assert batches['rewetted_dry_weeks']['baseline'] == 'green' and batches['rewetted_dry_weeks']['tree'] != 'green'
    assert (batches['missing_input']['tree'], batches['missing_input']['reason']) == ('not_sure', 'reason_missing_input')
