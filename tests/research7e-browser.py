#!/usr/bin/env python3
"""Browser integration smoke for the actual offline STARFALL 7E standalone.

Requires Playwright (test-only dependency) and Chromium. Headless WebGL,
when available, may be software accelerated: this is NOT real GPU QA.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
GAME=(ROOT/'PLAY-STARFALL.html').resolve()
assert GAME.is_file()

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=[
        '--use-gl=angle','--use-angle=swiftshader',
        '--enable-unsafe-swiftshader','--enable-webgl',
        '--no-sandbox','--disable-dev-shm-usage'
    ])
    try:
        page=browser.new_page(viewport={'width':1280,'height':800})
        errors=[]
        page.on('pageerror',lambda err: errors.append(str(err)))
        page.goto(GAME.as_uri(),wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('Boolean(window.StarfallRuntime && window.StarfallResearch7E && window.StarfallResearchUI7E)',timeout=90000)
        assert page.evaluate('window.StarfallRuntime.galaxy.systems.length')==2368
        assert page.evaluate('window.StarfallRuntime.galaxy.skyCatalog.length')==2304
        page.locator('#workbench-open').evaluate('(el)=>el.click()')
        assert page.locator('#workbench').evaluate('(el)=>!el.hidden')
        page.locator('#research7e-open').click()
        assert page.locator('#research7e').evaluate('(el)=>!el.hidden')
        assert page.locator('#workbench').evaluate('(el)=>el.hidden')
        page.locator('#research7e-name').fill('CI rover trial')
        page.locator('#research7e-slope').fill('6')
        page.locator('#research7e-duration').fill('60')
        page.locator('#research7e-run').click()
        page.wait_for_function("document.querySelector('#research7e-results h3')?.textContent.includes('CI rover trial')",timeout=15000)
        assert page.evaluate('window.StarfallResearchUI7E.store.runs.length')==1
        assert page.evaluate('window.StarfallResearchUI7E.store.runs[0].success')
        page.locator('#research7e-save-bp').click()
        assert page.evaluate('window.StarfallResearchUI7E.store.blueprints.length')==1
        page.locator('#research7e-gear').fill('2')
        page.locator('#research7e-run').click()
        assert page.evaluate('window.StarfallResearchUI7E.store.runs.length')==2
        page.locator('#research7e-compare-a').select_option(index=0)
        page.locator('#research7e-compare-b').select_option(index=1)
        page.locator('#research7e-compare').click()
        assert page.locator('#research7e-comparison .research7e-row').count()>0
        page.locator('#research7e-type').select_option('rocket')
        assert page.locator('#research7e-rocket-gravity').is_visible()
        page.locator('#research7e-rocket-gravity').fill('1.6')
        page.locator('#research7e-duration').fill('120')
        page.locator('#research7e-run').click()
        assert page.evaluate('window.StarfallResearchUI7E.store.runs.length')==3
        assert page.evaluate('window.StarfallResearchUI7E.store.runs[2].type')=='rocket'
        page.locator('#research7e-close').click()
        assert page.locator('#research7e').evaluate('(el)=>el.hidden')
        assert not any('StarfallResearch' in e for e in errors),errors
        print('PASS 7E offline Chromium: launch, 2368-star catalog, Workbench modal, rover trials, blueprint, comparisons, visible rocket controls and safe close')
        if errors:
            print('NOTICE: unrelated page errors seen:',errors[:5])
    finally:
        browser.close()
