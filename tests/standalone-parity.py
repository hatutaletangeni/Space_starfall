#!/usr/bin/env python3
"""Check editable script order matches the packed offline HTML; stdlib only."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
editable=(root/'index.html').read_text()
standalone=(root/'PLAY-STARFALL.html').read_text()
paths=re.findall(r'<script\s+src="([^"]+)"\s*>\s*</script>',editable)
assert len(paths)==8,f'Unexpected source script list: {paths}'
inline=re.findall(r'<script[^>]*>(.*?)</script>',standalone,re.S)
assert len(inline)==len(paths),f'Unexpected packed script list: {len(inline)}'
for source,embedded in zip(paths,inline):
    assert (root/source).read_text().strip()==embedded.strip(),f'Bundled code mismatch: {source}'
assert '.obs-backdrop' in editable and '.obs-backdrop' in standalone
assert 'obs-open' in standalone and 'fc-mode' in standalone and 'flight-trajectory' in standalone
print('PASS: standalone has all',len(paths),'script modules in exact source order; engineering/observatory controls present')
