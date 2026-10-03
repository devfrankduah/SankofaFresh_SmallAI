"""AC05: tree.json is under 250 KB, and the size of every file in web/ is measured.

Running this test writes evidence/sizes.json; commit it when web/ changes so the evidence stays current.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
TREE_LIMIT_BYTES = 250_000
APP_TARGET_BYTES = 1_000_000


def measure():
    files = {str(path.relative_to(ROOT)): path.stat().st_size
             for path in sorted(WEB.rglob('*')) if path.is_file() and path.name != '.gitkeep'}
    total = sum(files.values())
    return {'tree_json_bytes': files.get('web/tree.json'), 'tree_json_limit_bytes': TREE_LIMIT_BYTES,
            'web_total_bytes': total, 'web_target_bytes': APP_TARGET_BYTES,
            'web_total_within_target': total < APP_TARGET_BYTES, 'files': files}


def test_tree_is_under_250_kb_and_sizes_are_recorded():
    sizes = measure()
    assert sizes['tree_json_bytes'] is not None, 'web/tree.json is missing'
    assert sizes['tree_json_bytes'] < TREE_LIMIT_BYTES
    (ROOT / 'evidence' / 'sizes.json').write_text(json.dumps(sizes, indent=2) + '\n')
