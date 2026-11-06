#!/usr/bin/env python3
"""Build a separate fully offline STARFALL landscape mobile edition.
The same editable index.html and sources power the original desktop standalone.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text(encoding='utf-8')
css = (ROOT / 'src/mobile/landscape.css').read_text(encoding='utf-8')
hud = (ROOT / 'src/mobile/landscape.html').read_text(encoding='utf-8')
js = (ROOT / 'src/mobile/landscape.js').read_text(encoding='utf-8')
assert html.count('<body class="ui20">') == 1
assert html.count('</head>') == 1 and html.count('</body>') == 1
html = html.replace('</head>', '<style>\n' + css + '\n</style>\n</head>', 1)
html = html.replace('<body class="ui20">', '<body class="ui20 sfmobile-edition">\n' + hud, 1)
html = html.replace('</body>', '<script>\n' + js + '\n</script>\n</body>', 1)
def inline_style(match):
    path = (ROOT / match.group(1)).resolve()
    assert path.is_relative_to(ROOT.resolve())
    return '<style>\n' + path.read_text(encoding='utf-8') + '\n</style>'
def inline_script(match):
    path = (ROOT / match.group(1)).resolve()
    assert path.is_relative_to(ROOT.resolve())
    return '<script>\n' + path.read_text(encoding='utf-8') + '\n</script>'
html = re.sub(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>', inline_style, html, flags=re.I)
html = re.sub(r'<script\s+src="([^"]+)"\s*>\s*</script>', inline_script, html, flags=re.I)
path = ROOT / 'PLAY-STARFALL-MOBILE.html'
path.write_text(html, encoding='utf-8')
print('Mobile landscape standalone built:', path.stat().st_size, 'bytes')
