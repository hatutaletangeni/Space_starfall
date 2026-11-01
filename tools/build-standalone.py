#!/usr/bin/env python3
"""Build an offline, single-file game from the editable Starfall sources.
Python standard library only; no npm, internet, or external templating package.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css_pattern=re.compile(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>',re.I)
js_pattern=re.compile(r'<script\s+src="([^"]+)"\s*>\s*</script>',re.I)
def add_css(match):
    path=root/match.group(1)
    if not path.resolve().is_relative_to(root.resolve()):raise ValueError('Stylesheet escapes project')
    return '<style>\n'+path.read_text(encoding='utf-8')+'\n</style>'
def add_js(match):
    path=root/match.group(1)
    if not path.resolve().is_relative_to(root.resolve()):raise ValueError('Script escapes project')
    return '<script>\n'+path.read_text(encoding='utf-8')+'\n</script>'
html=css_pattern.sub(add_css,html)
html=js_pattern.sub(add_js,html)
(root/'PLAY-STARFALL.html').write_text(html,encoding='utf-8')
print('Standalone built:',(root/'PLAY-STARFALL.html').stat().st_size,'bytes')
