#!/usr/bin/env python3
"""8H real file:// Chromium integration with an explicitly controlled physical
test fixture. The ore, 8D extraction receipt and kit-installed empty depot are
provided ONLY to this isolated test profile; no production starter stock.
Tests actual Engineer controls, original truck battery, 8A custody, durable
reload and duplicate protection. Does not claim a complete mining playthrough.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve().as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1240,'height':850})
  errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http://','https://')) else None)
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!window.StarfallRuntime?.galaxy',timeout=60000)
  landed=page.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,
    old=SF.load().flightGalaxy||{};
   if(!b?.landable)throw Error('Expected one landable test world');
   SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:0,
    position:[p[0],p[1]+b.radius+8,p[2]],target:b.id,attached:b.id,
    groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
   return b.id;
  }""")
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("StarfallRuntime.landed && StarfallRuntime.eva && !!StarfallRuntime.outpostContext()?.local",timeout=60000)
  fixture=page.evaluate("""()=>{
   const rt=StarfallRuntime,c=rt.outpostContext(),p=rt.physical8a.serialize(),
    m=rt.materials8a.snapshot(),truck=p.assets.find(a=>a.id==='truck-expedition-001'),
    truckLocal=rt.outpostOffset(60,0),depotLocal=rt.outpostOffset(55,0),
    depotId='facility8e:real-test-depot',containerId='depot8h:'+depotId,
    lotId='mine:8d:drill:1',provenance='8c:real-tested-deposit',
    energy=5000000,fg=SF.load().flightGalaxy||{};
   if(!truck||!c.bodyId)throw Error('Existing truck/world missing');
   truck.location={kind:'surface',bodyId:c.bodyId,local:truckLocal};
   truck.state.batteryJ=energy;
   p.assets.push({id:depotId,type:'industrial_plant',massKg:480,
    volumeM3:1.8,condition:1,
    location:{kind:'surface',bodyId:c.bodyId,local:depotLocal},
    provenance:'TEST_FIXTURE_ONLY_CERTIFIED_KIT_RECEIPT_EMULATED',
    state:{station:'cargo_depot',enabled:true,containerId,
     tools:['dry_cargo_locker','calibrated_scale','mechanical_coupler','stock_manifest']}});
   m.containers.push({id:containerId,ownerId:depotId,kind:'sealed dry-solid cargo dock',
    maxMassKg:1200,maxVolumeM3:1.6});
   m.lots.push({id:lotId,materialId:'iron_ore',containerId:StarfallMining8D.TRUCK,
    massKg:20,volumeM3:.0116,provenance,grade:.75});
   const mining={schema:1,sequence:1,toolCondition:.996,active:null,history:[
    {id:'8d:drill:1',type:'DRILL',status:'COMMITTED',massKg:20,
     source:provenance,destination:StarfallMining8D.TRUCK,energyJ:57600}]};
   StarfallMaterials8A.create(m);StarfallPhysical8A.create(p);
   SF.save({physical8a:p,materials8a:m,mining8d:mining,
    logisticsOrders8h:{schema:1,orders:[]},logisticsEnergyReceipts8h:[],
    flightGalaxy:{...fg,shipCargo8b:{schema:1,mode:'ground',
     pose:{x:16.5,y:-7.25,z:39},counter:0},
     truckPose:{bodyId:c.bodyId,local:truckLocal,batteryJ:energy,
      forward:[0,0,1],lights:true,cargo:0}}});
   return{bodyId:c.bodyId,depotId,containerId,lotId};
  }""")
  assert fixture['bodyId']==landed,fixture
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(StarfallRuntime.landed && StarfallRuntime.eva &&
    StarfallRuntime.logisticsContext8H().lots.length===1 &&
    StarfallRuntime.logisticsContext8H().depots.length===1)""",timeout=60000)
  page.evaluate('STARFALL_DEBUG.placeEvaNearTruck()')
  preflight=page.evaluate("""()=>{
   const rt=StarfallRuntime,c=rt.logisticsContext8H(),d=rt.physical8a.get('facility8e:real-test-depot');
   return{near:c.operatorNear,truck:c.truckPresent,lot:c.lots[0].massKg,
    gap:StarfallOutposts.arc(rt.outpostContext().local,d.location.local,rt.nearest.radius),
    energy:c.energyJ};
  }""")
  assert preflight['near'] and preflight['truck'] and preflight['lot']==20,preflight
  assert preflight['gap']<=15,preflight
  page.locator('#ui21-navigation button[data-route="Engineer"]').click()
  ui=page.locator('#logistics8h-panel')
  ui.locator('#logistics8h-ore-lot').select_option(fixture['lotId'])
  ui.locator('#logistics8h-depot').select_option(fixture['depotId'])
  action=ui.locator('#logistics8h-dispatch')
  assert action.is_enabled()
  action.click()
  page.wait_for_function("SF.load().logisticsOrders8h?.orders?.[0]?.status==='LOADED'",timeout=12000)
  queued=page.evaluate("""()=>{
   const rt=StarfallRuntime,s=SF.load();
   return{orders:s.logisticsOrders8h.orders,truck:rt.materials8a.inventory(StarfallMining8D.TRUCK),
    depot:rt.materials8a.inventory('depot8h:facility8e:real-test-depot'),
    energy:rt.truck.batteryJ,operations:rt.materials8a.operations()};
  }""")
  assert len(queued['orders'])==1 and len(queued['truck'])==1,queued
  assert not queued['depot'] and abs(queued['energy']-5000000)<1,queued
  assert queued['operations'][-1]['status']=='RESERVED',queued
  firstid=queued['orders'][0]['id']
  ui.locator('#logistics8h-loaded-order').select_option(firstid)
  ui.locator('#logistics8h-cancel').click()
  page.wait_for_function("SF.load().logisticsOrders8h?.orders?.[0]?.status==='CANCELLED'",timeout=12000)
  released=page.evaluate("""()=>{
   const r=StarfallRuntime,s=SF.load();
   return{kg:r.materials8a.inventory(StarfallMining8D.TRUCK).reduce((v,l)=>v+l.massKg,0),
    battery:r.truck.batteryJ,status:s.materials8a.operations.at(-1)?.status,
    paid:s.logisticsEnergyReceipts8h.length};
  }""")
  assert released['kg']==20 and abs(released['battery']-5000000)<1,released
  assert released['status']=='CANCELLED' and released['paid']==0,released
  action.click()
  page.wait_for_function("""()=>SF.load().logisticsOrders8h?.orders?.length===2 &&
    SF.load().logisticsOrders8h.orders[1].status==='LOADED'""",timeout=12000)
  orderid=page.evaluate("SF.load().logisticsOrders8h.orders[1].id")
  ui.locator('#logistics8h-loaded-order').select_option(orderid)
  unload=ui.locator('#logistics8h-deliver')
  assert unload.is_enabled()
  unload.click()
  page.wait_for_function("SF.load().logisticsOrders8h?.orders?.[1]?.status==='DELIVERED'",timeout=15000)
  done=page.evaluate("""()=>{
   const rt=StarfallRuntime,s=SF.load(),t=rt.physical8a.get('truck-expedition-001');
   return{orders:s.logisticsOrders8h.orders,truckLots:rt.materials8a.inventory(StarfallMining8D.TRUCK),
    depotLots:rt.materials8a.inventory('depot8h:facility8e:real-test-depot'),
    energy:rt.truck.batteryJ,physicalEnergy:t.state.batteryJ,receipts:s.logisticsEnergyReceipts8h,
    storedEnergy:s.flightGalaxy.truckPose.batteryJ};
  }""")
  assert done['orders'][0]['status']=='CANCELLED' and done['orders'][1]['status']=='DELIVERED' and not done['truckLots'],done
  assert len(done['depotLots'])==1 and abs(done['depotLots'][0]['massKg']-20)<1e-6,done
  assert abs(done['energy']-4998800)<1e-5,done
  assert done['energy']==done['physicalEnergy']==done['storedEnergy'],done
  assert len(done['receipts'])==1 and done['receipts'][0]['usedJ']==1200,done
  duplicate=page.evaluate("""id=>{
   try{StarfallRuntime.logisticsDeliver8H(id);return 'UNSAFE_DUPLICATE';}
   catch(e){return String(e.message||e);}
  }""",orderid)
  assert 'UNSAFE_DUPLICATE' not in duplicate,duplicate
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("StarfallRuntime.logisticsContext8H?.().orders?.[1]?.status==='DELIVERED'",timeout=60000)
  saved=page.evaluate("""()=>{
   const r=StarfallRuntime;
   return{truck:r.truck.batteryJ,ore:r.materials8a.inventory('depot8h:facility8e:real-test-depot')
    .reduce((s,l)=>s+l.massKg,0),orders:r.logisticsContext8H().orders.length,
    receipts:SF.load().logisticsEnergyReceipts8h.length};
  }""")
  assert abs(saved['truck']-4998800)<1e-5 and saved['ore']==20 and saved['orders']==2 and saved['receipts']==1,saved
  # Physical reverse leg, using the SAME actual Engineer panel and original
  # stopped truck. No invented ore: source must be the committed depot lot.
  page.evaluate('STARFALL_DEBUG.placeEvaNearTruck()')
  page.wait_for_function("StarfallRuntime.logisticsContext8H().pickupLots.length===1",timeout=20000)
  page.locator('#ui21-navigation button[data-route="Engineer"]').click()
  pick=page.locator('#logistics8h-pickup-lot')
  assert pick.count()==1,'Original Engineer pickup selector absent'
  expected=page.evaluate("""()=>{
   const s=StarfallRuntime.logisticsContext8H(),l=s.pickupLots[0];
   return {lot:l.id,depot:l.depotId,kg:l.massKg,battery:s.energyJ};
  }""")
  assert expected['kg']==20 and abs(expected['battery']-4998800)<1e-5,expected
  pick.select_option(__import__('json').dumps([expected['lot'],expected['depot']],separators=(',',':')))
  pickup=page.locator('#logistics8h-pickup')
  assert pickup.is_enabled(),'Depot pickup action not ready when real EVA/truck dock present'
  pickup.click()
  page.wait_for_function("SF.load().logisticsPickupReceipts8h?.length===1",timeout=18000)
  collected=page.evaluate("""()=>{
    const r=StarfallRuntime,s=SF.load(),t=r.physical8a.get('truck-expedition-001');
    return {truck:r.materials8a.inventory(StarfallMining8D.TRUCK),
     depot:r.materials8a.inventory('depot8h:facility8e:real-test-depot'),
     pickup:s.logisticsPickupReceipts8h,
     energy:s.flightGalaxy.truckPose.batteryJ,
     liveEnergy:r.truck.batteryJ,physicalEnergy:t.state.batteryJ,
     paid:s.logisticsEnergyReceipts8h};
  }""")
  assert len(collected['truck'])==1 and abs(collected['truck'][0]['massKg']-20)<1e-6,collected
  assert not collected['depot'] and len(collected['pickup'])==1,collected
  assert len(collected['paid'])==2 and collected['paid'][1]['usedJ']==1200,collected
  assert abs(collected['energy']-4997600)<1e-5,collected
  assert collected['energy']==collected['liveEnergy']==collected['physicalEnergy'],collected
  replay=page.evaluate("""x=>{
   try{StarfallRuntime.logisticsPickup8H(x.lot,x.depot);return 'UNSAFE_DUPLICATE';}
   catch(e){return String(e.message||e);}
  }""",expected)
  assert replay!='UNSAFE_DUPLICATE',replay
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("SF.load().logisticsPickupReceipts8h?.length===1",timeout=60000)
  reloaded=page.evaluate("""()=>({
   kg:StarfallRuntime.materials8a.inventory(StarfallMining8D.TRUCK)
      .reduce((s,l)=>s+l.massKg,0),
   depot:StarfallRuntime.materials8a.inventory('depot8h:facility8e:real-test-depot').length,
   energy:StarfallRuntime.truck.batteryJ,
   receipts:SF.load().logisticsPickupReceipts8h.length,
   paid:SF.load().logisticsEnergyReceipts8h.length
  })""")
  assert (reloaded['kg']==20 and reloaded['depot']==0 and
    abs(reloaded['energy']-4997600)<1e-5 and reloaded['receipts']==1 and
    reloaded['paid']==2),reloaded
  assert not errors,errors[:12]
  assert not requests,requests[:12]
  print('PASS 8H real file:// Chromium: original mined-ore truck → manufactured dry depot → paid 1200J unload → paid 1200J pickup into SAME truck, durable reload and no duplicates')
 finally:
  browser.close()
