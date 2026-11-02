#!/usr/bin/env python3
"""T02 real file:// game / Outpost Power tab, source-owned grid and reload.
This uses controlled construction fixtures; not a complete manual EVA base-building expedition.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
target=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=[
      '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1200,'height':800})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("!!(window.StarfallOutpostUI && window.StarfallPowerLedgerT02 && window.StarfallPowerInspectorT02 && window.StarfallMissionOperationsUI)",timeout=30000)
        created=page.evaluate("""()=>{
          const rt=StarfallRuntime,O=StarfallOutposts,ui=StarfallOutpostUI,store=ui.store;
          const body=rt.nearest,sys=rt.galaxy.byId.get(body.systemId),V=O.V;
          const world=V.norm(V.sub(sys.star.position,body.position));
          const local=O.rotate(world,body.spinAxis||[0,1,0],-(body.spinAngle||0));
          const place=(kind,dist)=>store.add(kind,body,O.offset(local,[1,0,0],dist,0,body.radius),[0,0,1],()=>0).item;
          const solar=place('solar',0),battery=place('battery',25),antenna=place('antenna',50);
          store.link(solar.id,battery.id,body);store.link(battery.id,antenna.id,body);
          const t=rt.time;
          ui.advancePowerTo(t,()=>body); // instant grid status, no fictitious kWh
          const on=ui.powerReports.get(body.id);
          ui.persist();
          return {solar:solar.id,battery:battery.id,antenna:antenna.id,
            solarWatts:on.byId[solar.id].generatedW,radio:on.byId[antenna.id].power,
            sources:on.byId[antenna.id].sourceIds,bodyId:body.id};
        }""")
        assert created['solarWatts']>0 and created['radio'],created
        assert created['solar'] in created['sources'],created
        page.locator('#outpost-open').evaluate('(el)=>el.click()')
        page.locator('[data-outpost-tab="power"]').evaluate('(el)=>el.click()')
        page.locator('#outpost-node-a').select_option(created['antenna'])
        # Existing refresh recalculates the human-readable inspector from the source ledger.
        page.evaluate("StarfallOutpostUI.refresh()")
        inspector=page.locator('#outpost-t02-inspector').inner_text()
        assert created['solar'] in inspector and 'W served' in inspector,inspector
        page.locator('#outpost-toggle-power').evaluate('(el)=>el.click()')
        switched=page.evaluate("""id=>({
          on:StarfallOutpostUI.store.items.find(x=>x.id===id).enabled,
          powered:StarfallOutpostUI.powerReports.get(StarfallRuntime.nearest.id).byId[id].power
        })""",created['antenna'])
        assert switched=={'on':False,'powered':False},switched
        page.locator('#outpost-toggle-power').evaluate('(el)=>el.click()')
        on_again=page.evaluate("""id=>({
          enabled:StarfallOutpostUI.store.items.find(x=>x.id===id).enabled,
          powered:StarfallOutpostUI.powerReports.get(StarfallRuntime.nearest.id).byId[id].power,
          voltageV:StarfallPowerInspectorT02.getAssetStatus(id).voltageV
        })""",created['antenna'])
        assert on_again['enabled'] and on_again['powered'] and on_again['voltageV']==48,on_again
        page.evaluate('StarfallOutpostUI.persist()')
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("!!(window.StarfallPowerInspectorT02 && window.StarfallOutpostUI)",timeout=30000)
        after=page.evaluate("""id=>{
          const s=StarfallOutpostUI.store;
          return {count:s.items.length,enabled:s.items.find(x=>x.id===id)?.enabled,
            linked:s.wires.some(w=>w.a===id||w.b===id),
            inspected:!!StarfallPowerInspectorT02.getAssetStatus(id)};
        }""",created['antenna'])
        assert after['count']>=3 and after['enabled'] and after['linked'] and after['inspected'],after
        assert not errors,errors
        print('PASS T02 Chromium file://: real power tab, daylight source→battery→antenna, 48V per-device inspector, switch outage/reactivation, persisted wiring/switch after reload')
    finally:
        browser.close()
