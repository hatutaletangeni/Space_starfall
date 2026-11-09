#!/usr/bin/env python3
"""8I actual file:// Chromium paid T02 solar + zero-charge battery installation.

EXPLICIT CONTROLLED TEST_FIXTURE: inject 8F-format committed manufacturing
and 8E transformation evidence + resulting finite 8A lots. The real source
8F production loop is NOT exercised by this particular test. The active
flight runtime, original UI22 clicks, actual simulation time, battery debit,
outpost power node, state save/reload and original truck ARE exercised.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

URI=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1330,'height':860})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(URI,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!window.StarfallRuntime?.galaxy&&!!window.StarfallMaterials8A",timeout=60000)
  state=page.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,
    s=SF.load(),m=rt.materials8a.snapshot(),a=rt.physical8a.serialize();
   const ship=StarfallMining8D.SHIP;
   if(!b.landable||!m.containers.some(x=>x.id===ship))
    throw Error('Actual starting game world and 8A ship container missing');
   const factory={schema:1,serial:9,active:null,receipts:[]};
   const production={schema:1,operations:[]};
   let totalKg=0;
   for(let i=1;i<=9;i++){
    const solar=i===1,part=solar?'solar_module':'battery_cell',mass=solar?8.8:1.95,
     job='manufacture8f:'+i,lot='process:'+job+':1';
    m.lots.push({id:lot,materialId:part,massKg:mass,volumeM3:mass*.001,
     containerId:ship,provenance:'process:'+job,grade:1});
    factory.receipts.push({id:job,recipeId:part,bodyId:b.id,status:'COMMITTED',
     energyJ:solar?814000:720000,partMassKg:mass});
    production.operations.push({id:job,recipeId:part,outputs:{[part]:mass,
     manufacturing_scrap:solar?.3:.13},status:'COMMITTED',
     energyJ:solar?814000:720000});
    totalKg+=mass;
   }
   const expected={...s.flightGalaxy,seed:rt.galaxy.seed,time:0,
    position:[p[0],p[1]+b.radius+8,p[2]],attached:b.id,target:b.id,
    groundDirection:[0,1,0],up:[0,1,0],forward:[1,0,0],landed:true};
   if(SF.save({flightGalaxy:expected,physical8a:a,materials8a:m,
    factory8f:factory,transformations8e:production,
    freshExpedition:{schema:1},initialIndustrialManifest8k:{
      id:'TEST_FIXTURE_ONLY_SKIP_STARTER',status:'COMMITTED'}})===false)
    throw Error('Could not store isolated controlled source fixtures');
   return{seed:rt.galaxy.seed,originalTruck:a.assets.filter(x=>x.id==='truck-expedition-001').length,
    testKg:totalKg};
  }""")
  assert state['originalTruck']==1,state
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(StarfallRuntime?.landed&&StarfallRuntime?.eva&&
    StarfallT02PaidInstallUI8I&&StarfallOutpostUI?.store)""",timeout=60000)
  # Construct the controlled EVA anchor RELATIVE TO THE REAL LANDED SHIP,
  # never from a guessed world north pole or unrelated globe position.
  page.evaluate("""()=>{
   const rt=StarfallRuntime,c=rt.outpostContext(),p=rt.physical8a.serialize(),
    O=StarfallOutposts;
   if(!c.shipLocal||!c.body?.radius||!c.forward)
    throw Error('Actual landed ship body-fixed position missing');
   const local=O.offset(c.shipLocal,c.forward,55,0,c.body.radius);
   p.assets.push({id:'TEST_FIXTURE_ONLY_EVA_ANCHOR',type:'habitat_envelope',
    massKg:1,volumeM3:.001,condition:1,provenance:'TEST_FIXTURE_ONLY',
    location:{kind:'surface',bodyId:c.bodyId,local},state:{}});
   SF.save({physical8a:p});window.__STARFALL_IMPORT_PENDING=true;
  }""")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(StarfallRuntime?.landed&&StarfallRuntime?.eva&&StarfallOutpostUI?.store)",timeout=60000)
  page.evaluate("""()=>{
   STARFALL_DEBUG.placeEvaNearRepairAsset8G('TEST_FIXTURE_ONLY_EVA_ANCHOR');
   const ship=StarfallRuntime.vehicleStore.get('ship');
   if(!ship.state.powerEnabled)StarfallRuntime.vehicleStore.setPower('ship',true);
  }""")
  initial=page.evaluate("""()=>{
   const rt=StarfallRuntime,c=rt.t02PaidContext8I();
   let q;try{q=rt.t02PaidInstallQuote8I('solar');}catch(e){
    const x=rt.outpostContext(),anchor=rt.physical8a.get('TEST_FIXTURE_ONLY_EVA_ANCHOR');
    throw Error(String(e.message)+' / actual ship→EVA '+StarfallOutposts.arc(x.shipLocal,x.local,x.body.radius).toFixed(2)+
     ' / ship→anchor '+StarfallOutposts.arc(x.shipLocal,anchor.location.local,x.body.radius).toFixed(2)+
     ' / EVA→anchor '+StarfallOutposts.arc(x.local,anchor.location.local,x.body.radius).toFixed(2));
   }
   if(!q.ready||q.massKg!==8.8||!q.site||!c.eva)throw Error('Original 8F-ready solar installation unavailable');
   return{time:rt.time,shipBatteryJ:c.energyJ,quote:q,
    lots:rt.materials8a.snapshot().lots.filter(x=>x.provenance.startsWith('process:manufacture8f:')).length};
  }""")
  assert initial['lots']==9,initial
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  panel=page.locator('#t02-paid-install8i')
  assert panel.is_visible()
  panel.locator('select[aria-label="Select paid 8F solar or 48V battery"]').select_option('solar')
  button=panel.get_by_role('button',name='START PAID T02 INSTALLATION')
  assert button.is_enabled(),panel.inner_text()
  button.click()
  before=page.evaluate("""()=>{
   const r=StarfallRuntime,job=r.t02PaidContext8I().active,
    nodes=StarfallOutpostUI.store.items.filter(x=>x.kind==='solar');
   return{job,ownerNodes:nodes.length,remainingLots:r.materials8a.inventory(StarfallMining8D.SHIP).length};
  }""")
  assert before['job']['kind']=='solar' and before['ownerNodes']==0,before
  # The actual flight KeyT input cycles 1x→10x→100x; no clock mutation.
  page.keyboard.press('t');page.keyboard.press('t')
  page.wait_for_function("""()=>StarfallRuntime.t02PaidContext8I()?.lastReceipt?.kind==='T02_PAID_INSTALL_8I'
    &&StarfallRuntime.t02PaidContext8I().lastReceipt.installedMassKg===8.8""",timeout=60000)
  solar=page.evaluate("""()=>{
    const rt=StarfallRuntime,c=rt.t02PaidContext8I(),
    owner=StarfallOutpostUI.store.items.find(x=>x.kind==='solar'&&x.paidCertified8I),
    receipt=c.lastReceipt;
    return{time:rt.time,owner,receipt,remaining:rt.materials8a.inventory(StarfallMining8D.SHIP)
     .filter(x=>x.materialId==='solar_module').reduce((s,x)=>s+x.massKg,0)};
  }""")
  assert solar['owner']['ratedSolarW']==400 and solar['owner']['energyJ']==0,solar
  assert solar['remaining']==0,solar
  assert solar['receipt']['sourceBatteryJBefore']-solar['receipt']['sourceBatteryJAfter']==250000,solar
  assert solar['time']-before['job']['startedAtS']>=300,solar
  panel.locator('select[aria-label="Select paid 8F solar or 48V battery"]').select_option('battery')
  assert button.is_enabled(),panel.inner_text()
  button.click()
  b0=page.evaluate("""()=>{
    const rt=StarfallRuntime;return{job:rt.t02PaidContext8I().active,
      batteryCount:StarfallOutpostUI.store.items.filter(x=>x.kind==='battery').length};
  }""")
  assert b0['job']['kind']=='battery' and b0['batteryCount']==0,b0
  page.wait_for_function("""()=>StarfallRuntime.t02PaidContext8I()?.lastReceipt?.kind==='T02_PAID_INSTALL_8I'
    &&StarfallRuntime.t02PaidContext8I().lastReceipt.installedMassKg===15.6""",timeout=60000)
  battery=page.evaluate("""()=>{
    const rt=StarfallRuntime,c=rt.t02PaidContext8I(),
      node=StarfallOutpostUI.store.items.find(x=>x.kind==='battery'&&x.paidCertified8I);
    return{time:rt.time,node,receipt:c.lastReceipt,
     remaining:rt.materials8a.inventory(StarfallMining8D.SHIP)
      .filter(x=>x.materialId==='battery_cell').reduce((s,x)=>s+x.massKg,0),
     receipts:rt.materials8a.operations().filter(x=>x.kind==='T02_PAID_INSTALL_8I').length,
     originalTrucks:rt.physical8a.list().filter(x=>x.id==='truck-expedition-001').length};
  }""")
  assert battery['node']['energyJ']==0 and battery['node']['ratedCapacityJ']==9600000,battery
  assert battery['remaining']==0 and battery['receipts']==2 and battery['originalTrucks']==1,battery
  assert battery['time']-b0['job']['startedAtS']>=600,battery
  assert battery['receipt']['sourceBatteryJBefore']-battery['receipt']['sourceBatteryJAfter']==450000,battery
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(StarfallRuntime?.t02PaidContext8I&&StarfallOutpostUI?.store)""",timeout=60000)
  stored=page.evaluate("""()=>{
    const r=StarfallRuntime,items=StarfallOutpostUI.store.items,
      solar=items.find(x=>x.kind==='solar'&&x.paidCertified8I),
      battery=items.find(x=>x.kind==='battery'&&x.paidCertified8I),
      ops=r.materials8a.operations().filter(x=>x.kind==='T02_PAID_INSTALL_8I');
    return{solar, battery,receipts:ops.length,
      active:r.t02PaidContext8I().active,
      originalTrucks:r.physical8a.list().filter(x=>x.id==='truck-expedition-001').length};
  }""")
  assert stored['solar']['ratedSolarW']==400 and stored['battery']['ratedCapacityJ']==9600000,stored
  assert stored['battery']['energyJ']==0 and stored['receipts']==2 and stored['active'] is None,stored
  assert stored['originalTrucks']==1 and not errors,errors
  print('PASS controlled 8I real file:// Chromium: Mission Build paid source-lot solar 400 W + 48V battery 9.6MJ EMPTY, genuine KeyT 100x simulated 300s/600s, 8A materials and 700kJ committed once, persisted original T02 nodes, no truck duplication. Test inputs explicitly synthetic 8F-format receipts.')
 finally:
  browser.close()
