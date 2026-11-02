#!/usr/bin/env python3
"""T10 original offline Chromium: real 7D sampler produces physical cartridge;
real T02 wired storage and laboratory, bounded custody/assay and reload.
Controlled EVA fixture, not human-played sample delivery or interplanetary T03.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
target=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':850})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!window.StarfallScienceCustodyT10 && !!window.StarfallOutpostUI && !!window.StarfallLaunchUI',timeout=45000)
  created=page.evaluate("""()=>{
   const rt=StarfallRuntime,O=StarfallOutposts,ui=StarfallOutpostUI,C=StarfallScienceCustodyT10,
     body=rt.nearest,sys=rt.galaxy.byId.get(body.systemId),dir=O.V.norm(O.V.sub(sys.star.position,body.position)),
     local=O.rotate(dir,body.spinAxis||[0,1,0],-(body.spinAngle||0)),now=rt.time;
   const place=(kind,d)=>ui.store.add(kind,body,O.offset(local,[1,0,0],d,0,body.radius),
     [0,0,1],()=>0).item;
   const solar=place('solar',0),battery=place('battery',25),lab=place('lab',48),storage=place('storage',70);
   ui.store.link(solar.id,battery.id,body);ui.store.link(battery.id,lab.id,body);ui.store.link(lab.id,storage.id,body);
   ui.advancePowerTo(now,()=>body);
   const power=ui.powerReports.get(body.id);
   if(!power.byId[lab.id].power||!power.byId[storage.id].power)
    throw Error('T10 sample module and lab not on same real powered 48V bus: '+JSON.stringify(power));
   const rover={id:'probe-t10-browser',bodyId:body.id,systemId:body.systemId,bodySnapshot:{...body},
     local:O.offset(storage.local,[1,0,0],6,0,body.radius),batteryJ:9000000,
     heading:0,status:'parked',lastS:now,commands:[],index:0,remaining:0,records:[]};
   StarfallLaunchUI.store.rovers.push(rover);
   const G=StarfallGroundOps7D;
   G.acceptPacket(rover,[{op:'SAMPLE',value:'sampler'}],now,'controlled-t10-preaccepted-onboard-program');
   G.tick(rover,now+5,{body,height:Starfall3D.groundHeight,science:StarfallFieldScience,
     seed:rt.galaxy.seed,unitScale:StarfallPhysics.SCENE_METERS_PER_UNIT,
     link:{connected:false,reason:'no commissioned remote T03 link'},transportActive:true});
   if(rover.sampleInventory?.length!==1||rover.records.length!==1)
    throw Error('Actual 7D sampler did not create distinct real cartridge + numeric record: '+
      JSON.stringify({samples:rover.sampleInventory,records:rover.records,mode:rover.ground7d?.mode}));
   const source=rover.sampleInventory[0];
   let rejected=false;
   try{C.transfer(ui.store,ui.store.items.find(x=>x.id===storage.id),source,rover,body,
       {landed:true,eva:false,bodyId:body.id,local:storage.local},true,now+6);}
   catch(e){rejected=true;}
   if(!rejected)throw Error('Physical specimen transferred without an EVA player');
   const site=ui.store.items.find(x=>x.id===storage.id),work=ui.store.items.find(x=>x.id===lab.id);
   const specimen=C.transfer(ui.store,site,source,rover,body,
      {landed:true,eva:true,bodyId:body.id,local:storage.local},true,now+6);
   if(rover.sampleInventory.length||C.capacity(site).count!==1)throw Error('Custody duplicate or missing source debit');
   const sensed={...rover.records[0],receivedAtS:now+10};
   StarfallScienceUI.ingestRover(sensed); // controlled already-received fixture, not a fabricated T03 ACK
   const obs=StarfallScienceUI.journal.find(x=>x.id===sensed.id);
   if(!obs)throw Error('Original Science Journal refused genuine 7D numeric reading');
   const job=C.analyze(ui.store,work,obs,now+11,true);
   C.advanceLab(work,now+14,false);
   if(work.t10.analysis[0].status!=='PAUSED')throw Error('Lab did not pause on power failure');
   C.advanceLab(work,now+20,true);C.advanceLab(work,now+40,true);
   if(work.t10.analysis[0].status!=='COMPLETE')throw Error('Real timed assay did not complete with power');
   ui.persist();StarfallLaunchUI.persist();
   return{lab:lab.id,storage:storage.id,rover:rover.id,bodyId:body.id,
    specimen:specimen.id,originalObs:obs.id,analysis:job.id,receipt:site.t10.receipts[0].id,
    powerW:power.byId[lab.id].servedW};
  }""")
  assert created['powerW']>=950,created
  page.locator('#outpost-open').evaluate('(el)=>el.click()')
  page.locator('[data-outpost-tab="lab"]').evaluate('(el)=>el.click()')
  page.locator('#outpost-lab').select_option(created['lab'])
  page.evaluate('StarfallOutpostUI.refresh()')
  detail=page.locator('#t10-lab-readout').inner_text()
  assert created['originalObs'] in detail and created['specimen'] in detail and 'COMPLETE' in detail,detail
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!window.StarfallScienceCustodyT10 && !!window.StarfallLaunchUI',timeout=45000)
  restored=page.evaluate("""v=>{
    const store=StarfallOutpostUI.store,C=StarfallScienceCustodyT10,
      lab=store.items.find(x=>x.id===v.lab),storage=store.items.find(x=>x.id===v.storage),
      rover=StarfallLaunchUI.store.rovers.find(x=>x.id===v.rover);
    return{count:C.capacity(storage).count,sample:storage.t10.samples[0]?.id,
      custody:storage.t10.receipts[0]?.id,roverSamples:rover?.sampleInventory?.length||0,
      analysis:lab?.t10?.analysis?.[0]?.id,state:lab?.t10?.analysis?.[0]?.status,
      journal:StarfallScienceUI.journal.filter(x=>x.id===v.originalObs).length};
  }""",created)
  assert restored['count']==1 and restored['sample']==created['specimen'],restored
  assert restored['roverSamples']==0 and restored['analysis']==created['analysis'] and restored['state']=='COMPLETE',restored
  assert restored['journal']==1 and restored['custody']==created['receipt'],restored
  assert not errors,errors
  print('PASS T10 real file:// Chromium: original 7D physical sampler, separate numeric science observation, powered T02 storage/lab, denied transfer without EVA, exact source debit/custody, 20s powered assay paused on outage, UI details and full save/reload')
 finally:
  browser.close()
