"""Generate seeded synthetic parchment batches (Spec v2 section 6) with a farm-level split.

Run from the repository root:  python -m data.gen_batches
Writes data/batches.csv and data/manifest.json. Features come from model/contract.py, the encoder that
web/features.js is held to, so the training data and the app compute features the same way.
The labels are SYNTHETIC_DEMO: they follow the documented rule below, not field measurements.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import numpy as np

from model.contract import CONTRACT, encode, weather_features

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / 'data' / 'generator_config.json'
OUT_DIR = ROOT / 'data'
ALLOWED_SOURCES = {'FAO', 'Codex', 'ASSUMPTION'}
METADATA_KEYS = {'schema_version', 'evidence_mode', 'description'}
SPLITS = ('train', 'validation', 'test')
STRESS = 'season_stress'
LATENT_DECIMALS = 6
DRY_WEEKS_RH = 70.0
INPUT_NAMES = [field['name'] for field in CONTRACT['inputs']]
FEATURE_NAMES = [feature['name'] for feature in CONTRACT['features']]
COLUMNS = (['batch_id', 'farm_id', 'split'] + INPUT_NAMES + [f'feature_{name}' for name in FEATURE_NAMES]
           + ['latent_mc_dry', 'latent_emc', 'latent_mc_now', 'label'])


def load_config(path: Path = CONFIG_PATH) -> dict[str, Any]:
    """Parameter values by name. Every parameter must carry a source, or the generator refuses to run."""
    raw = json.loads(path.read_text())
    values: dict[str, Any] = {}
    for name, entry in raw.items():
        if name in METADATA_KEYS:
            continue
        if not isinstance(entry, dict) or set(entry) - {'value', 'source', 'note'} or 'value' not in entry:
            raise ValueError(f'config parameter {name} must be an object with value, source and an optional note')
        if entry.get('source') not in ALLOWED_SOURCES:
            raise ValueError(f'config parameter {name} needs a source of FAO, Codex or ASSUMPTION')
        values[name] = entry['value']
    return values


def band_for(moisture: float, config: dict[str, Any]) -> str:
    if moisture < config['green_below']:
        return 'green'
    return 'amber' if moisture < config['red_from'] else 'red'


def check_dates(year: int, months: list[int], inside: bool) -> list[date]:
    first, days = date(year, 1, 1), (date(year + 1, 1, 1) - date(year, 1, 1)).days
    return [first + timedelta(d) for d in range(days) if ((first + timedelta(d)).month in months) == inside]


def generate_batch(rng: np.random.Generator, farm_offset: float, check_date: date, batch_label: str,
                   weather: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    """One batch: raw answers, latent moisture and label. The order of random draws is part of the format."""
    days_drying = int(np.clip(round(rng.normal(config['days_drying_mean'], config['days_drying_sd'])), 0, 30))
    rewetted = bool(rng.random() < config['rewetted_probability'])
    on_floor = bool(rng.random() < config['floor_probability'])
    days_stored = int(rng.integers(0, config['days_stored_max'] + 1))
    drying_noise = float(rng.normal(0.0, config['mc_dry_noise_sd']))
    storage_start = (check_date - timedelta(days=days_stored)).isoformat()

    mc_dry = (config['mc_dry_base'] - config['mc_dry_slope_per_day'] * min(days_drying, config['mc_dry_day_cap'])
              + drying_noise + farm_offset + (config['rewetted_moisture_add'] if rewetted else 0.0))
    rh14_mean = weather_features(storage_start, days_stored, weather)['rh14_mean']
    emc = (config['emc_at_reference_rh'] + config['emc_slope_per_rh_point'] * (rh14_mean - config['emc_reference_rh'])
           + (config['floor_moisture_add'] if on_floor else 0.0))
    # Rounded before labelling so the label always agrees with the value written to the CSV.
    mc_now = round(mc_dry + (emc - mc_dry) * (1.0 - math.exp(-days_stored / config['storage_time_constant_days'])),
                   LATENT_DECIMALS)
    band = band_for(mc_now, config)

    readings = config['dryness_reading_by_band'][band]
    draw = rng.random()
    if draw < config['dryness_check_matches']:
        dryness = readings['match']
    elif draw < config['dryness_check_matches'] + config['dryness_check_unsure']:
        dryness = 'unsure'
    else:
        dryness = readings['wrong']
    musty_probability = {'green': config['musty_probability_below_green_limit'], 'amber': config['musty_probability_amber'],
                         'red': config['musty_probability_red']}[band]
    musty = bool(rng.random() < musty_probability)

    inputs = {'batch_label': batch_label, 'days_drying': days_drying, 'rewetted': 'yes' if rewetted else 'no',
              'storage_surface': 'floor' if on_floor else 'raised', 'musty_smell': 'yes' if musty else 'no',
              'dryness_check': dryness, 'days_stored': days_stored, 'storage_start': storage_start}
    encoded = encode(inputs, weather)
    if encoded.features is None:
        raise AssertionError(f'generated inputs abstained ({encoded.abstain_reason}): {inputs}')
    if encoded.features[FEATURE_NAMES.index('rh14_mean')] != rh14_mean:
        raise AssertionError('encoder and generator disagree on rh14_mean')
    return {**inputs, 'features': encoded.features, 'latent_mc_dry': round(mc_dry, LATENT_DECIMALS),
            'latent_emc': round(emc, LATENT_DECIMALS), 'latent_mc_now': mc_now, 'label': band}


def generate(config: dict[str, Any], weather: dict[str, Any]) -> list[dict[str, Any]]:
    year = weather['year']
    season = config['stress_season_months']
    main_dates, stress_dates = check_dates(year, season, inside=False), check_dates(year, season, inside=True)
    main_seq, stress_seq, split_seq = np.random.SeedSequence(config['seed']).spawn(3)
    n_main = config['main_farms']
    shares = config['split_shares']
    order = np.random.default_rng(split_seq).permutation(n_main)
    n_train, n_validation = round(shares['train'] * n_main), round(shares['validation'] * n_main)
    split_of = {int(farm): ('train' if rank < n_train else 'validation' if rank < n_train + n_validation else 'test')
                for rank, farm in enumerate(order)}

    farms = [(f'F{i + 1:03d}', split_of[i], seq, main_dates) for i, seq in enumerate(main_seq.spawn(n_main))]
    farms += [(f'S{i + 1:03d}', STRESS, seq, stress_dates) for i, seq in enumerate(stress_seq.spawn(config['stress_farms']))]
    rows = []
    for farm_id, split, seq, dates in farms:
        rng = np.random.default_rng(seq)
        farm_offset = float(rng.normal(0.0, config['farm_drying_offset_sd']))
        for b in range(config['batches_per_farm']):
            check_date = dates[int(rng.integers(0, len(dates)))]
            batch = generate_batch(rng, farm_offset, check_date, f'Batch {b % 10 + 1}', weather, config)
            rows.append({'batch_id': f'{farm_id}-{b + 1:03d}', 'farm_id': farm_id, 'split': split, **batch})
    return rows


def to_csv(rows: list[dict[str, Any]]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator='\n')
    writer.writerow(COLUMNS)
    for row in rows:
        writer.writerow([row['batch_id'], row['farm_id'], row['split']] + [row[name] for name in INPUT_NAMES]
                        + row['features'] + [row['latent_mc_dry'], row['latent_emc'], row['latent_mc_now'], row['label']])
    return buffer.getvalue()


def is_rewetted_in_dry_weeks(row: dict[str, Any]) -> bool:
    return row['rewetted'] == 'yes' and row['features'][FEATURE_NAMES.index('rh14_mean')] < DRY_WEEKS_RH


def summarise(rows: list[dict[str, Any]]) -> dict[str, Any]:
    counts, farms, subset = {}, {}, {}
    for split in SPLITS + (STRESS,):
        in_split = [r for r in rows if r['split'] == split]
        labels = [r['label'] for r in in_split]
        counts[split] = {band: labels.count(band) for band in CONTRACT['classes']} | {'total': len(labels)}
        farms[split] = len({r['farm_id'] for r in in_split})
        wet = [r for r in in_split if is_rewetted_in_dry_weeks(r)]
        flagged = sum(r['label'] in ('amber', 'red') for r in wet)
        subset[split] = {'rows': len(wet), 'amber_or_red': flagged}
    main = [r for r in rows if r['split'] != STRESS]
    red_share = sum(r['label'] == 'red' for r in main) / len(main)
    return {'farms': farms, 'counts': counts, 'main_red_share': round(red_share, 4),
            'rewetted_in_dry_weeks': subset, 'dry_weeks_rule': f'rewetted is yes and rh14_mean below {DRY_WEEKS_RH:g}'}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main(argv: list[str]) -> dict[str, Any]:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--config', type=Path, default=CONFIG_PATH)
    parser.add_argument('--out-dir', type=Path, default=OUT_DIR, help='where batches.csv and manifest.json go')
    args = parser.parse_args(argv)
    config = load_config(args.config)
    weather_path = ROOT / config['weather_table']
    weather = json.loads(weather_path.read_text())
    rows = generate(config, weather)
    text = to_csv(rows)
    summary = summarise(rows)
    manifest = {
        'evidence_mode': 'SYNTHETIC_DEMO',
        'command': 'python -m data.gen_batches',
        'seed': config['seed'],
        'config_sha256': sha256(args.config.read_bytes()),
        'weather_sha256': sha256(weather_path.read_bytes()),
        'batches_sha256': sha256(text.encode()),
        'rows': len(rows),
        'numpy_version': np.__version__,
        'feature_columns': [f'feature_{name}' for name in FEATURE_NAMES],
        **summary,
    }
    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / 'batches.csv').write_text(text)
    (args.out_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return manifest


if __name__ == '__main__':
    result = main(sys.argv[1:])
    print(json.dumps({k: result[k] for k in ('rows', 'farms', 'counts', 'main_red_share', 'rewetted_in_dry_weeks')}, indent=1))
