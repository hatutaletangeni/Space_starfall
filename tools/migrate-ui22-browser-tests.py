#!/usr/bin/env python3
"""Migrate stale UI21 Chromium test navigation to visible UI22 Mission workflow.

This updates ONLY an exact old click that is permanently CSS-hidden by UI22.
It does not remove, mock, alter or skip any gameplay assertion.
Runs on checked-out repo tests and is intentionally idempotent.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
STAGES={'Overview':'Navigate','Explore':'Explore','Engineer':'Build',
        'Operate':'Operate','Records':'Records'}
changed=[]
for path in sorted((ROOT/'tests').glob('*-browser.py')):
    original=path.read_text(encoding='utf-8')
    out=[]
    count=0
    for line in original.splitlines(keepends=True):
        stripped=line.strip()
        route=next((name for name in STAGES if stripped ==
            'page.locator(\'#ui21-navigation button[data-route="'+name+'"]\').click()'),None)
        if route is None:
            out.append(line)
            continue
        indent=line[:len(line)-len(line.lstrip())]
        stage=STAGES[route]
        out.extend((
            indent+"# UI22 visible mission workflow; all original scenario assertions remain.\n",
            indent+"page.locator('#sf-mission-button').click()\n",
            indent+"page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='"+stage+"').click()\n",
            indent+"page.locator('#sf-mission-flow .sf-flow-workspace').click()\n"
        ))
        count+=1
    if count:
        path.write_text(''.join(out),encoding='utf-8')
        changed.append((str(path.relative_to(ROOT)),count))
for name,count in changed:
    print('MIGRATED',name,count)
print('Migrated legacy UI21 browser click sites:',sum(c for _,c in changed),
      'across',len(changed),'test files')
