#!/usr/bin/env python3
"""Real offline UI / atomic source owners / native rocket ticks.
CONTROLLED PROTOCOL FIXTURE: supplied completed stage, source gas, greenhouse
and fabricated recycler evidence; this is not a fresh no-cheat expedition.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts'/'industry-completion';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,file,width,height in [('desktop','PLAY-STARFALL.html',1200,800),('mobile','PLAY-STARFALL-MOBILE.html',932,430)]:
   context=browser.new_context(viewport={'width':width,'height':height},has_touch=name=='mobile');page=context.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto((ROOT/file).as_uri(),wait_until='domcontentloaded');page.wait_for_function('!!window.StarfallRuntime?.industryCompletion8K')
   page.evaluate('SF.startNewExpedition(742);window.__STARFALL_IMPORT_PENDING=true');page.reload(wait_until='domcontentloaded')
   page.wait_for_function('!!SF.load().initialIndustrialManifest8k')
   page.evaluate("""()=>{
    const r=StarfallRuntime,s=SF.load(),b=r.galaxy.byId.get('star-0-p1');r.galaxy.update(0);
    const physical=r.physical8a.serialize(),m=StarfallMaterials8A.create(r.materials8a.snapshot()),
     local=[Math.sin(45/b.radius),Math.cos(45/b.radius),0],loc={kind:'surface',bodyId:b.id,local},
     parts=Object.entries(StarfallAssembly8G.DEFINITIONS.rocket_stage.parts).map(([materialId,massKg])=>({materialId,massKg,lotId:'protocol-part:'+materialId})),
     mass=parts.reduce((s,p)=>s+p.massKg,0);
    physical.assets.push({id:'protocol-rig',type:'industrial_plant',condition:1,massKg:900,volumeM3:2.9,location:loc,state:{station:'rocket_integration'}},
     {id:'protocol-stage',type:'rocket_stage_dry',condition:1,massKg:mass,volumeM3:3,location:loc,provenance:'structural-8g:protocol-stage',state:{assemblyFacilityId:'protocol-rig'}},
     {id:'protocol-shell',type:'habitat_envelope',condition:1,massKg:985.4,volumeM3:25,location:loc,state:{}});
    for(const [gas,kg,mw]of [['hydrogen',5,.002016],['oxygen',50,.031998]]){
     const id='protocol-'+gas,cid=id+':gas';m.registerContainer({id:cid,ownerId:id,kind:'rated gas vessel',maxMassKg:1000,maxVolumeM3:4});
     m.importLot({id:id+':source',materialId:gas,massKg:kg,volumeM3:kg/mw*8.314462618*293.15/5e6,grade:1,containerId:cid,provenance:'chemical:protocol-electrolysis'});
     physical.assets.push({id,type:'industrial_vessel',massKg:195,volumeM3:4,condition:1,location:loc,state:{enabled:true,materialId:gas,containerId:cid,ratedPressurePa:8e6}});
    }
    m.importLot({id:'protocol-recycler',materialId:'habitat_recycler',massKg:40,volumeM3:.1,grade:1,containerId:StarfallMining8D.SHIP,provenance:'process:protocol-factory'});
    const factory=r.factory8f.snapshot();factory.receipts.push({id:'protocol-factory',recipeId:'habitat_recycler',status:'COMMITTED'});
    const out=StarfallOutpostUI.store.serialize(),h=StarfallHabitatT09.defaults(0);
    Object.assign(h,{enabled:true,occupants:1,greenhouse8i:{schema:1,installed:true,cropBiomassKg:.2,nutrientKg:.2,carbonConsumedMol:0,waterConsumedKg:0,oxygenProducedMol:0}});
    out.items.push({id:'protocol-hab',kind:'hab',bodyId:b.id,local,physicalAssetId:'protocol-shell',condition:1,enabled:true,habT09:h});
    const vehicles=r.vehicleStore.serialize();vehicles.states.ship.powerEnabled=true;
    const dir=Starfall3D.V.rot([0,1,0],b.spinAxis||[0,1,0],b.spinAngle||0);
    SF.save({materials8a:m.snapshot(),physical8a:physical,factory8f:factory,outpost5:out,engineeringVehicles:vehicles,
     vehicleAssembly8g:{schema:1,receipts:[{id:'protocol-stage',assetId:'protocol-stage',blueprintId:'rocket_stage',bodyId:b.id,status:'ASSEMBLED_NOT_OPERATIONAL',massKg:mass,consumedLots:parts}]},
     flightGalaxy:{...s.flightGalaxy,seed:742,time:0,position:b.position.map((x,i)=>x+dir[i]*(b.radius+8)),target:b.id,attached:b.id,groundDirection:dir,up:dir,forward:[1,0,0],landed:true}});
    window.__STARFALL_IMPORT_PENDING=true;
   }""")
   page.reload(wait_until='domcontentloaded');page.wait_for_function('!!(window.StarfallRuntime?.landed&&StarfallRuntime.eva)')
   page.evaluate("STARFALL_DEBUG.placeEvaNearGasVessel8G('protocol-oxygen');StarfallUI21.openRoute('Engineer')")
   section=page.locator('#industrial-completion8k');section.locator('summary').filter(has_text='Manufactured rocket flight').click()
   section.get_by_label('Manufactured rocket stage',exact=True).select_option('protocol-stage')
   section.get_by_label('Actual hydrogen vessel',exact=True).select_option('protocol-hydrogen')
   section.get_by_label('Actual oxygen vessel',exact=True).select_option('protocol-oxygen')
   section.get_by_role('button',name='HOT-FIRE & LAUNCH MANUFACTURED STAGE',exact=True).click()
   page.wait_for_function("StarfallLaunchUI.store.launches.some(m=>m.sourcePaid8g)")
   assert page.evaluate("!StarfallRuntime.physical8a.get('protocol-stage')")
   page.wait_for_function("StarfallLaunchUI.store.launches.find(m=>m.sourcePaid8g).flight.integratedS>0")
   section.locator('summary').filter(has_text='Habitat regenerative loop').click()
   section.get_by_label('Greenhouse habitat',exact=True).select_option('protocol-hab')
   section.get_by_role('button',name='INSTALL MANUFACTURED RECYCLER',exact=True).click()
   page.wait_for_function("!!StarfallOutpostUI.store.items.find(h=>h.id==='protocol-hab').habT09.regenerative8i")
   conservation=page.evaluate("""()=>{
    const r=StarfallRuntime,c=r.atmosphericContext8J(),v=r.physical8a.get('protocol-oxygen'),l=r.materials8a.inventory(v.state.containerId)[0];
    r.atmosphericRelease8J(v.id,l.id,1);
    const old=r.materials8a.inventory(v.state.containerId).reduce((s,l)=>s+l.massKg,0),energy=r.vehicleStore.get('ship').state.energyJ;
    const q=r.industryCompletion8K('capture8j',{vesselId:v.id,kg:.5});
    return{debit:energy-q.shipEnergyJ,added:r.materials8a.inventory(v.state.containerId).reduce((s,l)=>s+l.massKg,0)-old,
     delta:q.world.netAddedKg,pressure:q.world.pressureDeltaPa};
   }""")
   assert abs(conservation['added']-.5)<1e-7 and abs(conservation['delta']-.5)<1e-7 and conservation['debit']>1e6,conservation
   section.scroll_into_view_if_needed();page.screenshot(path=str(OUT/(name+'-controls.png')))
   page.evaluate("window.dispatchEvent(new Event('pagehide'))")
   page.reload(wait_until='domcontentloaded');page.wait_for_function('!!window.StarfallRuntime?.industryCompletion8K')
   assert page.evaluate("!StarfallRuntime.physical8a.get('protocol-stage')&&StarfallLaunchUI.store.launches.filter(m=>m.sourcePaid8g).length===1")
   assert page.evaluate("!!StarfallOutpostUI.store.items.find(h=>h.id==='protocol-hab').habT09.regenerative8i")
   assert not errors,errors
   (OUT/(name+'-result.json')).write_text(json.dumps({'result':'PASS','scope':'controlled protocol fixtures; native UI, flight, custody and reload','capture':conservation},indent=2))
   print('PASS native',name,'manufactured rocket, recycler, capture, source power and save/reload',flush=True);context.close()
 finally:browser.close()
