"""AC05: tree.json is under 250 KB, the whole app is under the 1 MB target, and evidence/sizes.json is current.

The test writes evidence/sizes.json only when UPDATE_SIZES=1 is set:
    UPDATE_SIZES=1 python -m pytest tests/test_size.py
Otherwise it fails when the committed file no longer matches web/ and prints that command.
"""
import json
import os

from model.sizes import APP_TARGET_BYTES, SIZES_PATH, TREE_LIMIT_BYTES, measure

REFRESH_COMMAND = 'UPDATE_SIZES=1 python -m pytest tests/test_size.py'


def test_tree_is_under_250_kb():
    sizes = measure()
    assert sizes['tree_json_bytes'] is not None, 'web/tree.json is missing'
    assert sizes['tree_json_bytes'] < TREE_LIMIT_BYTES


def test_whole_app_is_under_the_1_mb_target():
    assert measure()['web_total_bytes'] < APP_TARGET_BYTES


def test_committed_sizes_are_current():
    sizes = measure()
    if os.environ.get('UPDATE_SIZES') == '1':
        SIZES_PATH.write_text(json.dumps(sizes, indent=2) + '\n')
    committed = json.loads(SIZES_PATH.read_text()) if SIZES_PATH.exists() else None
    assert committed == sizes, f'evidence/sizes.json is out of date with web/. Refresh it with: {REFRESH_COMMAND}'
