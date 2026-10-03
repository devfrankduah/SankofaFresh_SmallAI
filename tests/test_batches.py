"""Rules the synthetic dataset must keep (Spec v2 section 6), checked on the committed data/batches.csv."""
import csv
import json
from pathlib import Path

import pytest

from data.gen_batches import ALLOWED_SOURCES, METADATA_KEYS, band_for, load_config
from model.contract import CONTRACT, encode

ROOT = Path(__file__).resolve().parents[1]
CONFIG = load_config()
WEATHER = json.loads((ROOT / CONFIG['weather_table']).read_text())
INPUT_NAMES = [field['name'] for field in CONTRACT['inputs']]
FEATURE_NAMES = [feature['name'] for feature in CONTRACT['features']]
with (ROOT / 'data' / 'batches.csv').open(newline='') as handle:
    ROWS = list(csv.DictReader(handle))


def inputs_of(row):
    inputs = {name: row[name] for name in INPUT_NAMES}
    for field in CONTRACT['inputs']:
        if field['type'] == 'integer':
            inputs[field['name']] = int(inputs[field['name']])
    return inputs


def test_every_config_parameter_has_a_source():
    raw = json.loads((ROOT / 'data' / 'generator_config.json').read_text())
    for name, entry in raw.items():
        if name not in METADATA_KEYS:
            assert entry['source'] in ALLOWED_SOURCES, name


def test_no_dont_know_anywhere():
    dont_know = CONTRACT['dont_know_value']
    assert not any(dont_know in row.values() for row in ROWS)


def test_features_are_what_the_shared_encoder_gives():
    for row in ROWS[::37]:
        expected = encode(inputs_of(row), WEATHER).features
        assert [float(row[f'feature_{name}']) for name in FEATURE_NAMES] == [float(v) for v in expected], row['batch_id']


def test_labels_follow_the_latent_moisture_rule():
    for row in ROWS:
        assert row['label'] == band_for(float(row['latent_mc_now']), CONFIG), row['batch_id']


def test_main_splits_keep_red_between_10_and_50_percent():
    main = [row for row in ROWS if row['split'] != 'season_stress']
    assert 0.10 <= sum(row['label'] == 'red' for row in main) / len(main) <= 0.50


@pytest.mark.parametrize('split', ['train', 'validation', 'test'])
def test_rewetted_batches_in_dry_weeks_include_amber_or_red(split):
    rewetted_dry = [row for row in ROWS if row['split'] == split and row['rewetted'] == 'yes'
                    and float(row['feature_rh14_mean']) < 70]
    assert rewetted_dry and any(row['label'] in ('amber', 'red') for row in rewetted_dry)
