"""The validation-only depth sweep (evidence/depth_sweep.json) and the depth model/train.py ships."""
import json
from pathlib import Path

from model.depth_sweep import MACRO_F1_TOLERANCE, MIN_COVERAGE, REFERENCE_DEPTH, SWEEP_PATH, main as run_sweep
from model.train import MAX_DEPTH

SWEEP = json.loads(SWEEP_PATH.read_text())


def test_shipped_depth_is_the_sweep_choice():
    assert MAX_DEPTH == SWEEP['chosen_max_depth']
    assert json.loads((Path(__file__).resolve().parents[1] / 'web' / 'tree.json').read_text())['training']['max_depth'] == MAX_DEPTH


def test_choice_follows_the_rule():
    reference = next(row for row in SWEEP['depths'] if row['max_depth'] == REFERENCE_DEPTH)['macro_f1']
    allowed = [row for row in SWEEP['depths'] if row['coverage'] >= MIN_COVERAGE and row['macro_f1'] >= reference - MACRO_F1_TOLERANCE]
    assert min(allowed, key=lambda row: (row['false_reassurance_rate'], row['max_depth']))['max_depth'] == SWEEP['chosen_max_depth']


def test_sweep_regenerates_exactly(tmp_path, monkeypatch):
    committed = SWEEP_PATH.read_text()
    out = tmp_path / 'depth_sweep.json'
    monkeypatch.setattr('model.depth_sweep.SWEEP_PATH', out)
    run_sweep([])
    assert out.read_text() == committed
