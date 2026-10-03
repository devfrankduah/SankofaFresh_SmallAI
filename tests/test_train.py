"""model/train.py and the committed web/tree.json (spec 5.4, AC05 tree part)."""
import json
from pathlib import Path

import numpy as np

import model.train as train_module
from model.bands import band
from model.train import MIN_VALIDATION_COVERAGE, fit, load_rows, matrix
from model.tree_format import validate_tree

ROOT = Path(__file__).resolve().parents[1]
TREE = json.loads((ROOT / 'web' / 'tree.json').read_text())
TRAINING = json.loads((ROOT / 'evidence' / 'training.json').read_text())
ROWS = load_rows()


def traverse(tree, features):
    """Walk tree.json the way web/tree.js does: float32 inputs, left when x <= threshold."""
    node = tree['nodes'][0]
    while 'value' not in node:
        node = tree['nodes'][node['left'] if np.float32(features[node['feature']]) <= node['threshold'] else node['right']]
    return node['value']


def test_committed_tree_is_valid_and_small():
    validate_tree(TREE)
    assert (ROOT / 'web' / 'tree.json').stat().st_size < 250_000
    assert TREE['model_version'] == f'tree-v2-{TREE["sha256"][:7]}'


def test_feature_ranges_come_from_the_training_split():
    X, _ = matrix(ROWS, 'train')
    for index, name in enumerate(TREE['feature_names']):
        assert TREE['feature_ranges'][name] == [X[:, index].min(), X[:, index].max()], name


def test_tree_json_reproduces_predict_proba_exactly_on_every_row():
    model = fit(*matrix(ROWS, 'train'), TREE['training']['seed'])
    for split in ('train', 'validation', 'test', 'season_stress'):
        X, _ = matrix(ROWS, split)
        exported = np.array([traverse(TREE, row) for row in X])
        assert np.array_equal(exported, model.predict_proba(X)), split


def test_abstain_cut_follows_the_validation_rule():
    allowed = [row for row in TRAINING['candidates'] if row['coverage'] >= MIN_VALIDATION_COVERAGE]
    best = min(allowed, key=lambda row: (row['false_reassurance_rate'], -row['coverage'], row['abstain_cut']))
    assert TREE['abstain_cut'] == best['abstain_cut'] == TRAINING['chosen']['abstain_cut']


def test_test_and_stress_rows_cannot_change_the_tree(tmp_path, monkeypatch):
    flipped = {'green': 'red', 'amber': 'green', 'red': 'amber'}
    scrambled = [dict(row, label=flipped[row['label']]) if row['split'] in ('test', 'season_stress') else row for row in ROWS]
    monkeypatch.setattr(train_module, 'load_rows', lambda *args: scrambled)
    retrained = train_module.train(tmp_path / 'tree.json', tmp_path / 'rules.md', tmp_path / 'training.json')
    assert retrained['sha256'] == TREE['sha256'] and retrained['abstain_cut'] == TREE['abstain_cut']


def test_leaf_bands_use_the_shared_band_rule():
    leaves = [node['value'] for node in TREE['nodes'] if 'value' in node]
    assert {band(value, TREE['abstain_cut']) for value in leaves} <= {'green', 'amber', 'red', 'not_sure'}
