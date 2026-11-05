#!/usr/bin/env python3
"""Real original seed742 STARFALL file:// WebGL2 Engineer/Industry UI smoke.
Only reads the authoritative original 8A and T02 snapshots. No synthetic
depot, pipeline, ore or gas is injected and no remote cargo is teleported.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=[
        '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
        '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1280,'height':800})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("""()=>!!(
          window.StarfallRuntime?.industryFlowContext8H &&
          window.StarfallIndustryFlowUI8H?.refresh &&
          document.querySelector('#industry8h-refresh') &&
          document.querySelector('#industry8h-stages')?.children.length===8 &&
          document.querySelector('#industry8h-details')?.textContent.includes('ORIGINAL OWNER')
        )""",timeout=65000)
        result=page.evaluate("""()=>{
          const rt=StarfallRuntime,s=rt.materials8a.snapshot(),
           hardware=rt.physical8a.serialize(),
           grid=StarfallOutpostUI.durableSnapshot(),
           saved=SF.load(),ship=rt.physical8a.get('ship-main'),
           truck=rt.physical8a.get('truck-expedition-001');
          const before={stock:JSON.stringify(s),hardware:JSON.stringify(hardware),
           power:JSON.stringify(grid),
           save:JSON.stringify(SF.load())};
          document.querySelector('#industry8h-refresh').click();
          const report=rt.industryFlowContext8H();
          const after={stock:JSON.stringify(rt.materials8a.snapshot()),
           hardware:JSON.stringify(rt.physical8a.serialize()),
           power:JSON.stringify(StarfallOutpostUI.durableSnapshot()),
           save:JSON.stringify(SF.load())};
          return{
            seed:rt.galaxy.seed,ship:ship?.id,truck:truck?.id,
            equal:JSON.stringify(before)===JSON.stringify(after),
            rowCount:document.querySelector('#industry8h-stages').children.length,
            physicalKg:report.totals.totalMassKg,
            lotCount:report.totals.lotCount,
            sourceOwner:report.sourceOwner,
            statuses:report.stages.map(x=>x.state),
            message:document.querySelector('#industry8h-details').textContent,
            readOnly:document.querySelector('#industry8h-status').textContent
          };
        }""")
        assert result['seed']==742,result
        assert result['ship']=='ship-main' and result['truck']=='truck-expedition-001',result
        assert result['rowCount']==8 and result['sourceOwner']=='original-8A',result
        assert result['equal'],'Inspector unexpectedly mutated actual original 8A / physical / T02 / saved state: '+str(result)
        assert 'SHIP LOADER' in result['message'] and 'NOT A GRAPH TELEPORT' in result['message'],result
        assert 'Read-only' in result['readOnly'],result
        assert not errors,errors
        print('PASS actual original Chromium/WebGL2 Engineer physical material flow readout; original 2368-star seed742 ship/truck, 8A stock, T02 grid and persistent save unchanged')
    finally:
        browser.close()
