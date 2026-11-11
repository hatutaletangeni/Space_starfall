#!/usr/bin/env python3
"""Build a dependency-free single-file Celestial Studio editor."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
def inline_css(match):
    path=(root/match.group(1)).resolve()
    if not path.is_relative_to(root): raise ValueError('CSS outside editor root')
    return '<style>\n'+path.read_text(encoding='utf-8')+'\n</style>'
def inline_js(match):
    path=(root/match.group(1)).resolve()
    if not path.is_relative_to(root): raise ValueError('JS outside editor root')
    return '<script>\n'+path.read_text(encoding='utf-8')+'\n</script>'
html=re.sub(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>',inline_css,html,flags=re.I)
html=re.sub(r'<script\s+src="([^"]+)"\s*>\s*</script>',inline_js,html,flags=re.I)
(root/'PLAY-STARFALL-ENGINE.html').write_text(html,encoding='utf-8')
print('Editor standalone built:',len(html),'characters')
