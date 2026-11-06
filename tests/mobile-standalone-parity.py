#!/usr/bin/env python3
"""Independent mobile bundle/source parity and mobile-only touch-control security gates."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
raw=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'src/mobile/landscape.css').read_text(encoding='utf-8')
hud=(ROOT/'src/mobile/landscape.html').read_text(encoding='utf-8')
js=(ROOT/'src/mobile/landscape.js').read_text(encoding='utf-8')
out=(ROOT/'PLAY-STARFALL-MOBILE.html').read_text(encoding='utf-8')
assert raw.count('<body class="ui20">')==1
expected=raw.replace('</head>','<style>\n'+css+'\n</style>\n</head>',1)
expected=expected.replace('<body class="ui20">','<body class="ui20 sfmobile-edition">\n'+hud,1)
expected=expected.replace('</body>','<script>\n'+js+'\n</script>\n</body>',1)
def embed(m,kind):
 p=(ROOT/m.group(1)).resolve()
 assert p.is_relative_to(ROOT.resolve()),'Escaping mobile offline import'
 assert p.is_file()
 return f'<{kind}>\n'+p.read_text(encoding='utf-8')+f'\n</{kind}>'
expected=re.sub(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>',lambda m:embed(m,'style'),expected,flags=re.I)
expected=re.sub(r'<script\s+src="([^"]+)"\s*>\s*</script>',lambda m:embed(m,'script'),expected,flags=re.I)
assert out==expected,'Mobile standalone differs from editable game sources; run python tools/build-mobile-standalone.py'
assert not re.search(r'<(?:script|link)\b[^>]+(?:src|href)\s*=\s*["\']https?://',out,re.I)
assert len(re.findall(r'data-control="(?:Key[A-Z]|Arrow(?:Up|Down)|Space|ShiftLeft)"',hud))>=10
assert 'data-mobile-key="KeyX"' in hud and 'data-mobile-key="KeyI"' in hud and 'data-mobile-key="KeyB"' in hud
assert 'data-mobile-key="KeyT"' in hud and 'data-mobile-key="KeyV"' in hud
assert 'user-select:none' in css and '-webkit-tap-highlight-color:transparent' in css
assert 'orientation:portrait' in css and 'sfmobile-rotate' in css
assert 'sfmobile-edition' not in raw,'Desktop source must remain unchanged'
print('PASS: mobile edition fully inlined, touch controls, no button text selection, landscape rotation and desktop isolation')
