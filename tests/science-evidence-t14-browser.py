#!/usr/bin/env python3
"""T14 actual file:// Chromium software WebGL. Controlled landed fixture only:
source-tagged rover sensor journal, map coordinates and filter, reload, no phantom
unreceived photos. Separate T03/T05/T07 suites prove transport/render.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  context=browser.new_context(viewport={'width':1250,'height':820})
  errors=[]
  boot=context.new_page()
  boot.on('pageerror',lambda e:errors.append(str(e)))
  boot.goto(uri,wait_until='domcontentloaded',timeout=90000)
  boot.wait_for_function("!!(window.StarfallRuntime&&window.StarfallScienceT14&&window.StarfallSurveyUI)",timeout=50000)
  saved=boot.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,s=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...s,seed:rt.galaxy.seed,time:0,position:[p[0],p[1]+b.radius+8,p[2]],
    target:b.id,attached:b.id,groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
   return SF.load();
  }""")
  # One-time guarded import, never a context init_script that could overwrite
  # accumulated journal evidence on the later genuine save/reload.
  boot.close()
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallScienceT14&&window.StarfallScienceUI&&window.StarfallSurveyUI)",timeout=50000)
  page.evaluate("""state=>{
   window.__STARFALL_IMPORT_PENDING=true;
   localStorage.setItem('starfall_save',JSON.stringify(state));
  }""",saved)
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallScienceT14&&window.StarfallScienceUI&&window.StarfallSurveyUI)",timeout=50000)
  a=page.evaluate("""()=>{
   const rt=StarfallRuntime;
   if(!rt.landed||!rt.roverAutonomyPosition())throw Error('Real local rover and landed surface required');
   const obs=StarfallScienceUI.measure('magnetometer',true);
   if(!obs.t14||obs.t14.source!=='seeded simulation'||obs.t14.energyJ!==obs.powerJ)
     throw Error('T14 sensor metrology did not survive real source measurement');
   const coords=StarfallScienceT14.latLon(obs.location),rover=StarfallRoverT06.latLon(obs.location);
   if(Math.abs(coords.lon-rover.lon)>1e-8||Math.abs(coords.lat-rover.lat)>1e-8)
     throw Error('Real sensor coordinates do not match real navigation');
   const before=StarfallScienceUI.journal.length;
   const corrupted={...obs,id:'obs-t14-malformed',location:[NaN,0,1]};
   if(StarfallScienceUI.ingestRover(corrupted))throw Error('Malformed observation illegally ingested');
   if(StarfallScienceUI.journal.length!==before)throw Error('Corrupt entry changed original science Journal');
   return{bodyId:obs.bodyId,id:obs.id,sourceId:obs.sourceAssetId,
    value:obs.value,unit:obs.unit,uncertainty:obs.t14.effectiveUncertainty,coords};
  }""")
  page.locator('#survey-open').evaluate('(el)=>el.click()')
  page.wait_for_function("!document.querySelector('#survey-panel').hidden",timeout=15000)
  page.locator('#survey-t14-filter').select_option('measurement')
  view=page.evaluate("""id=>{
   StarfallSurveyUI.draw();
   const markers=StarfallSurveyUI.visibleMarkers;
   if(markers.some(x=>x.type!=='measurement'))throw Error('Instrument filter leaked unrelated game markers');
   const m=markers.find(x=>x.id===id);
   if(!m||m.sourceId!==StarfallRuntime.vehicleStore.get('rover').definition.id)throw Error('Source-tagged real rover reading not rendered');
   if(StarfallSurveyUI.coverage[StarfallRuntime.nearest.id]?.length>2400)throw Error('Map coverage overflow');
   return{found:m.id,quality:m.quality,summary:document.getElementById('survey-t14-summary').textContent,
     markerTotal:markers.length};
  }""",a['id'])
  assert a['id']==view['found'] and view['markerTotal']>=1,view
  page.locator('#survey-t14-filter').select_option('photo')
  not_photo=page.evaluate("""()=>{StarfallSurveyUI.draw();return StarfallSurveyUI.visibleMarkers.filter(x=>x.type==='photo').length}""")
  assert not_photo==0,'No real camera downlink exists in this controlled test fixture'
  page.locator('#survey-close').evaluate('(el)=>el.click()')
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallScienceUI&&window.StarfallSurveyUI)",timeout=50000)
  restored=page.evaluate("""id=>{
   const x=StarfallScienceUI.journal.find(x=>x.id===id);
   if(!x?.t14||x.t14.source!=='seeded simulation')throw Error('T14 measurement metadata not restored in canonical save');
   if(StarfallScienceUI.journal.filter(x=>x.id===id).length!==1)throw Error('Duplicate science evidence after reload');
   return{found:x.id,bodyId:x.bodyId,sourceId:x.sourceAssetId};
  }""",a['id'])
  assert restored['found']==a['id'],restored
  assert not errors,errors
  print('PASS T14 file:// Chromium: real local rover sample, original Joules and source, received Journal, map filter, exact rover longitude/latitude, no invented photo, invalid rejection, reload',a,view)
 finally:
  browser.close()
