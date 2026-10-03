"""AC02: the same seed gives a byte-identical dataset and the same tree; a different seed changes the data."""
import hashlib
import json
from pathlib import Path

from data.gen_batches import main as generate_dataset
from model.train import main as train_tree

ROOT = Path(__file__).resolve().parents[1]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_same_seed_regenerates_the_committed_dataset_byte_for_byte(tmp_path):
    generate_dataset(['--out-dir', str(tmp_path)])
    committed = json.loads((ROOT / 'data' / 'manifest.json').read_text())
    assert sha256(tmp_path / 'batches.csv') == committed['batches_sha256'] == sha256(ROOT / 'data' / 'batches.csv')
    assert (tmp_path / 'manifest.json').read_text() == (ROOT / 'data' / 'manifest.json').read_text()


def test_a_different_seed_gives_a_different_dataset(tmp_path):
    config = json.loads((ROOT / 'data' / 'generator_config.json').read_text())
    config['seed']['value'] += 1
    changed = tmp_path / 'config.json'
    changed.write_text(json.dumps(config))
    generate_dataset(['--config', str(changed), '--out-dir', str(tmp_path)])
    committed = json.loads((ROOT / 'data' / 'manifest.json').read_text())
    assert sha256(tmp_path / 'batches.csv') != committed['batches_sha256']


def test_retraining_gives_the_committed_tree_byte_for_byte(tmp_path):
    train_tree(['--out-dir', str(tmp_path)])
    assert (tmp_path / 'tree.json').read_text() == (ROOT / 'web' / 'tree.json').read_text()
    assert (tmp_path / 'tree_rules.md').read_text() == (ROOT / 'docs' / 'tree_rules.md').read_text()
    assert (tmp_path / 'training.json').read_text() == (ROOT / 'evidence' / 'training.json').read_text()
