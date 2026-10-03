"""AC03: no synthetic farm appears in more than one split, and stress farms stay out of the main splits."""
import csv
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN_SPLITS = {'train', 'validation', 'test'}


def rows():
    with (ROOT / 'data' / 'batches.csv').open(newline='') as handle:
        return list(csv.DictReader(handle))


def test_no_farm_appears_in_more_than_one_split():
    splits_by_farm = defaultdict(set)
    for row in rows():
        splits_by_farm[row['farm_id']].add(row['split'])
    shared = {farm: sorted(splits) for farm, splits in splits_by_farm.items() if len(splits) > 1}
    assert not shared, shared


def test_split_shares_are_by_farm():
    farms = defaultdict(set)
    for row in rows():
        farms[row['split']].add(row['farm_id'])
    assert set(farms) == MAIN_SPLITS | {'season_stress'}
    assert [len(farms[s]) for s in ('train', 'validation', 'test')] == [36, 12, 12]
    assert not farms['season_stress'] & set().union(*(farms[s] for s in MAIN_SPLITS))
