"""Measure every file in web/ and write evidence/sizes.json (AC05: total app size measured and reported).

Run from the repository root when web/ changes or evidence is refreshed:  python -m model.sizes
tests/test_size.py checks the same limits without writing anything.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
SIZES_PATH = ROOT / 'evidence' / 'sizes.json'
TREE_LIMIT_BYTES = 250_000
APP_TARGET_BYTES = 1_000_000


def measure() -> dict[str, Any]:
    files = {str(path.relative_to(ROOT)): path.stat().st_size
             for path in sorted(WEB.rglob('*')) if path.is_file() and path.name != '.gitkeep'}
    total = sum(files.values())
    return {'tree_json_bytes': files.get('web/tree.json'), 'tree_json_limit_bytes': TREE_LIMIT_BYTES,
            'web_total_bytes': total, 'web_target_bytes': APP_TARGET_BYTES,
            'web_total_within_target': total < APP_TARGET_BYTES, 'files': files}


def main(argv: list[str]) -> None:
    sizes = measure()
    SIZES_PATH.write_text(json.dumps(sizes, indent=2) + '\n')
    print(f'Wrote {SIZES_PATH.relative_to(ROOT)}: web/ is {sizes["web_total_bytes"]} bytes over {len(sizes["files"])} files; '
          f'tree.json is {sizes["tree_json_bytes"]} bytes')


if __name__ == '__main__':
    main(sys.argv[1:])
