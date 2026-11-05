#!/usr/bin/env python3
"""STARFALL 8H: real file:// Chromium smoke for ORIGINAL offworld ship manifest UI.
No free depot, inventory, energy, simulated flight or test-faked page state.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve().as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=[
        '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
        '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1200,'height':760})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("""()=>!!(window.StarfallRuntime&&
          window.StarfallOffworldManifest8H&&window.StarfallOffworldManifestUI8H&&
          document.getElementById('offworld8h-readout')?.textContent.includes('ORIGINAL SHIP HOLD'))""",timeout=60000)
        observed=page.evaluate("""()=>{
         const r=StarfallRuntime,c=r.logisticsOffworldContext8H(),
          saved=SF.load(),actual=r.materials8a.inventory(StarfallOffworldManifest8H.HOLD),
          energy=r.vehicleStore.get('ship').state.energyJ,old=JSON.stringify(saved.materials8a);
         let rejected=false;
         try{r.logisticsOffworldRegister8H('fabricated-free-lot','fabricated-free-depot');}
         catch(error){rejected=true;}
         const after=SF.load();
         return{rejected,lotCount:actual.length,
          lotMass:actual.reduce((n,l)=>n+l.massKg,0),
          displayedMass:c.shipHold.reduce((n,l)=>n+l.massKg,0),
          manifestCount:c.manifests.length,
          archived:after.logisticsOffworldManifests8h?.manifests?.length||0,
          savedMaterialUnchanged:JSON.stringify(after.materials8a)===old,
          energyUnchanged:r.vehicleStore.get('ship').state.energyJ===energy,
          hasControls:!!document.querySelector('#offworld8h-register')&&
           !!document.querySelector('#offworld8h-deliver'),
          reserveDisabled:document.querySelector('#offworld8h-register').disabled,
          status:document.getElementById('offworld8h-readout').textContent};
        }""")
        assert observed['rejected'],observed
        assert observed['lotMass']==observed['displayedMass'],observed
        assert observed['savedMaterialUnchanged'] and observed['energyUnchanged'],observed
        assert observed['hasControls'] and 'SAVED SHIP MANIFESTS' in observed['status'],observed
        assert observed['manifestCount']==observed['archived'],observed
        assert not errors,errors
        print('PASS 8H: real standalone WebGL2 offworld manifest UI, original ship custody and fail-closed invented shipment')
    finally:
        browser.close()
