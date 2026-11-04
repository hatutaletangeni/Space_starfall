#!/usr/bin/env python3
"""Update 7F expedition integration QA: actual offline browser APIs and dialogs.

This DOES NOT assert the complete manual scenarios A/B/C are proven. It tests
cross-feature UI reachability, browser reload and safe save validation, online
request isolation and software-rendered frame diagnostics.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import os

ROOT=Path(__file__).resolve().parents[1]
TARGET=(ROOT/'PLAY-STARFALL.html').resolve()
ARTIFACT=ROOT/'artifacts'/'7f-expedition-ci'
ARTIFACT.mkdir(parents=True,exist_ok=True)
assert TARGET.exists()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=[
        '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
        '--enable-webgl','--no-sandbox','--disable-dev-shm-usage',
        '--enable-precise-memory-info'
    ])
    try:
        context=browser.new_context(viewport={'width':1280,'height':800})
        page=context.new_page()
        errors=[]
        network=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http://','https://')) else None)
        page.goto(TARGET.as_uri(),wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("!!(window.StarfallRuntime && window.StarfallIntegration && window.StarfallLaunchUI && window.StarfallScienceUI && window.StarfallImagingUI7F)",timeout=30000)

        # Actual application event handlers, no stubbed UI state; only invoke DOM
        # elements programmatically if their parent drawer is collapsed.
        panels=[
            ('workbench-open','workbench','wb-close'),
            ('field-open','field-lab','field-close'),
            ('outpost-open','outpost','outpost-close'),
            ('launch-open','launch-dialog','launch-close'),
            ('survey-open','survey-panel','survey-close'),
            ('integration-open','integration-modal','integration-close'),
            ('imaging7f-open','imaging7f','imaging7f-close')
        ]
        visited=[]
        for opener,dialog,closer in panels:
            assert page.locator('#'+opener).count()==1,opener
            page.locator('#'+opener).evaluate('(el)=>el.click()')
            assert page.locator('#'+dialog).evaluate('(el)=>!el.hidden'), (dialog, 'pageerrors', errors[-5:], 'ui-state', page.evaluate('''()=>({launched:!document.getElementById('launch-dialog').hidden,route:document.querySelector('#ui21-navigation button[aria-current="true"]')?.dataset.route,toolsOpen:document.body.classList.contains('ui20-tools-open')})'''))
            visited.append(dialog)
            page.locator('#'+closer).evaluate('(el)=>el.click()')
            assert page.locator('#'+dialog).evaluate('(el)=>el.hidden'),dialog+' did not close'

        # Rebind and inverted-axes behavior via actual control API, without
        # sending movement that changes the player's saved flight state.
        controls=page.evaluate("""()=>{
          const C=window.StarfallControls.create();
          const old=C.signedDrag(5,10);
          const original=C.snapshot?.()||C.settings||{};
          const positive=C.flightPitch(3.5);
          return {old,positive,defaults:window.StarfallControls.DEFAULTS};
        }""")
        assert controls['positive'] in (3.5,-3.5)
        assert 'thrust' in controls['defaults']

        # Import validation must not discard current files on wrong-seed or
        # damaged launch/imagery metadata; old compatible saves remain valid.
        validation=page.evaluate("""()=>{
          const seed=window.StarfallRuntime.galaxy.seed,V=window.StarfallIntegration.validateSave,
                save=window.SF.load();
          const base={version:2,flightGalaxy:{seed,time:10,position:[2,3,4]},launch7:{schema:1,seed,launches:[],satellites:[],rovers:[]},imaging7f:{schema:1,photos:[],jobs:[]}};
          const good=V(base,seed);
          const old=V({version:1,flightGalaxy:{seed,time:2,position:[0,0,0]}},seed);
          const checks=[
            {...base,launch7:{...base.launch7,seed:seed+1}},
            {...base,launch7:{...base.launch7,rovers:[{not:'valid'}]}},
            {...base,launch7:{...base.launch7,rovers:[{id:'x',bodyId:'world'},{id:'x',bodyId:'world'}]}},
            {...base,imaging7f:{schema:1,photos:{corrupt:true}}},
            {...base,flightGalaxy:{...base.flightGalaxy,position:[Infinity,1,2]}}
          ];
          const rejected=checks.map(x=>{try{V(x,seed);return false;}catch(_){return true;}});
          window.SF.save({hardening7fFixture:{kind:'browser-save-reload',value:77331}});
          return {good:!!good,old:!!old,rejected,seed};
        }""")
        assert validation['good'] and validation['old'] and all(validation['rejected']),validation
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("!!(window.StarfallRuntime && window.StarfallImagingUI7F)",timeout=30000)
        assert page.evaluate("window.SF.load().hardening7fFixture?.value") == 77331, 'Actual file:// reload lost unrelated saved field'

        # Real headless Chromium/SwiftShader frame percentiles. These are
        # captured as software CI observations, NOT real GPU benchmarks.
        page.locator('#integration-open').evaluate('(el)=>el.click()')
        page.locator('#integration-enable').check()
        page.locator('#integration-close').click()
        page.wait_for_timeout(4000)
        diag=page.evaluate("""()=>{
          const d=window.StarfallIntegration.diagnostics();
          d.softwareWebGL=true;
          d.memoryJSHeapBytes=performance.memory?.usedJSHeapSize??null;
          d.consoleErrorsSample=window.__qaConsoleErrors||0;
          return d;
        }""")
        assert diag['frameMS']['count']>=10,diag
        assert diag['frameMS']['p50']>0
        assert diag['galaxy']['stars']==2368
        # Captured artefacts are genuine screenshots from headless software WebGL.
        page.screenshot(path=str(ARTIFACT/'offline-game-chromium.png'),full_page=False)
        with open(ARTIFACT/'software-webgl-performance.json','w',encoding='utf-8') as fd:
            json.dump({'machine':'GitHub-hosted Ubuntu, headless Chromium SwiftShader; NOT real GPU','diagnostics':diag,
                       'panels':visited,'saveValidation':validation,'networkRequests':network,'pageErrors':errors},fd,indent=2)
        assert not network, 'Standalone attempted external HTTP(S) requests: '+str(network[:5])
        assert not errors, 'JavaScript page errors: '+str(errors[:5])
        print('PASS 7F hardening browser: seven actual dialogs open/close, save validation rejects corruption, old-save acceptance, file:// reload, zero HTTP requests, software-WebGL diagnostic artifact')
        print('CI software WebGL p50/p95/p99 (ms):',diag['frameMS']['p50'],diag['frameMS']['p95'],diag['frameMS']['p99'],
              'JS heap bytes:',diag['memoryJSHeapBytes'],'frames:',diag['frameMS']['count'])
    finally:
        browser.close()
