#!/usr/bin/env python3
"""Strict editable-vs-standalone parity check (no third-party dependencies).

Build logic intentionally matches tools/build-standalone.py. Any script/style
omission, order change, whitespace/content mismatch or unsynchronized build
fails, rather than counting a stale fixed number of modules.
"""
from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
editable=(root/'index.html').read_text(encoding='utf-8')
standalone=(root/'PLAY-STARFALL.html').read_text(encoding='utf-8')
css_re=re.compile(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>',re.I)
js_re=re.compile(r'<script\s+src="([^"]+)"\s*>\s*</script>',re.I)
styles=css_re.findall(editable)
scripts=js_re.findall(editable)
assert len(scripts)>=38, f'Missing source modules: {len(scripts)}'
assert len(set(scripts))==len(scripts),'Duplicate source script module'
assert len(set(styles))==len(styles),'Duplicate source stylesheet'
assert all(p.startswith('src/') and '..' not in Path(p).parts for p in scripts+styles), 'Unexpected file path'

def embed_css(match):
    path=root/match.group(1)
    return '<style>\n'+path.read_text(encoding='utf-8')+'\n</style>'

def embed_js(match):
    path=root/match.group(1)
    return '<script>\n'+path.read_text(encoding='utf-8')+'\n</script>'

compiled=js_re.sub(embed_js,css_re.sub(embed_css,editable))
assert compiled==standalone, 'Offline build differs from editable source; run python tools/build-standalone.py'
assert 'workbench-open' in standalone and 'field-lab' in standalone, 'Engineering panels missing'
assert not re.search(r'<(?:script|link)\b[^>]+(?:src|href)\s*=\s*["\']https?://',standalone,re.I), 'Runtime network dependency in standalone'
print(f'PASS: {len(scripts)} source scripts and {len(styles)} external stylesheets exactly match offline standalone (no external runtime imports)')
