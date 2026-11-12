/* STARFALL 9G: EVA scanner multitool. Original Field Science owns the journal.
 * The wearable is a finite-energy UI/controller, NOT a source of free materials.
 * Scan samples are model estimates and never count as proof of alien biology.
 */
(function(root){'use strict';
 const RT=root.StarfallRuntime,Science=root.StarfallScienceUI,F=root.StarfallFieldScience,
  $=id=>document.getElementById(id);
 if(!RT||!Science||!F)throw Error('9G multitool requires runtime and authoritative science journal');
 const MODES=Object.freeze(['bioassay','spectrometer','thermometer','barometer','magnetometer']);
 const MAX_J=35000,CHARGE_J_PER_SEC=1100,COOLDOWN_MS=1100;
 const saved=SF.load()?.multitool9g||{};
 let chargeJ=Number.isFinite(saved.chargeJ)?Math.max(0,Math.min(MAX_J,saved.chargeJ)):MAX_J;
 let mode=MODES.includes(saved.mode)?saved.mode:'bioassay',busy=false,lastStart=-Infinity,
  active=null,open=false,lastObservation=null,lastVisualTarget=null,pulseUntil=0;
 const validMode=x=>MODES.includes(x);
 const spec=x=>F.INSTRUMENTS[x];
 const cost=x=>spec(x).powerW*spec(x).seconds;
 const available=()=>{const c=RT.scienceContext();return !!(c.mode==='EVA'&&c.landed&&c.body?.landable&&Array.isArray(c.local)&&!RT.truckOccupied);};
 function persist(){SF.save({multitool9g:{schema:1,chargeJ,mode}});}
 function status(msg,error=false){
  const node=$('multitool9g-status');if(node){node.textContent=String(msg);node.dataset.error=error?'true':'false';}
 }
 function setMode(next){
  if(!validMode(next))throw Error('Unknown scanner mode');
  if(busy)throw Error('Scanner is acquiring a reading');
  mode=next;$('multitool9g-mode').value=mode;persist();render();
  status(spec(mode).name.toUpperCase()+' READY · '+spec(mode).seconds+' s acquisition');
 }
 function cycle(){setMode(MODES[(MODES.indexOf(mode)+1)%MODES.length]);}
 function visibleTarget(){
  const ctx=RT.outpostContext(),scene=root.StarfallEcologyUI?.scene;
  if(!ctx?.eva||!ctx.position||!ctx.forward||!scene)return null;
  const a=scene(),vx=ctx.forward,vm=Math.hypot(...vx)||1;
  let result=null,rank=Infinity;
  for(const creature of a){
   if(!creature?.alive||!Array.isArray(creature.position))continue;
   const d=creature.position.map((v,i)=>v-ctx.position[i]),range=Math.hypot(...d);
   if(range<.1||range>45)continue;
   const dot=d.reduce((sum,v,i)=>sum+v*vx[i],0)/(range*vm);
   if(dot<.68)continue;
   const score=range/(.5+dot);
   if(score<rank){rank=score;result={kind:creature.kind,id:creature.id,range};}
  }
  return result;
 }
 function format(obs){
  return (lastVisualTarget?'VISIBLE FAUNA: '+lastVisualTarget.kind+' / '+lastVisualTarget.id+' ('+lastVisualTarget.range.toFixed(1)+' scene units)\nVISUAL MODEL IDENTIFICATION ONLY, NOT LABORATORY PROOF\n':'')+obs.parameter+': '+Number(obs.value).toFixed(obs.unit==='K'?1:obs.unit==='Pa'?0:4)+' '+obs.unit+
    ' ±'+Number(obs.uncertainty).toFixed(3)+'\n'+obs.biome+' · '+obs.bodyId+
    '\nQUALITY: '+String(obs.quality||'estimated').toUpperCase()+
    '\nSIMULATED SCIENCE · '+obs.id;
 }
 function render(){
  const activeEva=available(),s=spec(mode),btn=$('multitool9g-trigger');
  const title=$('multitool9g-title'),power=$('multitool9g-power'),record=$('multitool9g-last');
  if(title)title.textContent='FIELD SCANNER · '+s.name.toUpperCase();
  if(power)power.textContent=(chargeJ/1000).toFixed(2)+' / '+(MAX_J/1000).toFixed(1)+' kJ · '+s.powerW+' W × '+s.seconds+' s';
  if(btn){btn.disabled=busy||!activeEva||chargeJ<cost(mode);
   btn.textContent=busy?'ACQUIRING… '+s.seconds+' s':'SCAN '+s.name.toUpperCase();}
  if(record)record.textContent=lastObservation?format(lastObservation):'No scanner readings recorded in this session.';
  const opener=$('multitool9g-open');
  if(opener){opener.hidden=!activeEva;opener.textContent=busy?'◉ SCANNING':'◉ MULTITOOL';}
  const pct=$('multitool9g-charge');
  if(pct)pct.style.width=(100*chargeJ/MAX_J).toFixed(1)+'%';
  if(open&&!activeEva)close();
  // Pulse state is exposed by the API getter for the avatar renderer.
 }
 function close(){open=false;$('multitool9g-panel').hidden=true;}
 function show(){
  if(!available()){status('Exit the ship or truck into EVA to use the multitool',true);return false;}
  open=true;$('multitool9g-panel').hidden=false;render();return true;
 }
 function recharge(){
  if(busy)throw Error('Finish current scan first');
  const ctx=RT.outpostContext(),body=ctx.body;
  if(!available()||!body||!ctx.shipLocal||ctx.bodyId!==body.id)throw Error('Recharge beside your landed ship');
  const arc=root.StarfallEcology?.arc;
  if(!arc||arc(ctx.local,ctx.shipLocal,body.radius)>30)throw Error('Approach within 30 scene units of the ship');
  // Limit charging time in real seconds and never invent a ship energy debit.
  // Require a powered ship and deduct charge through a physical ship source
  // when the runtime supplies a certified power transfer endpoint.
  if(typeof RT.multitoolRecharge9G!=='function')throw Error('Ship-to-multitool power transfer is not installed; no free recharge');
  const requested=MAX_J-chargeJ;
  const accepted=RT.multitoolRecharge9G(requested);
  if(!(accepted>0))throw Error('Ship has no available power for recharging');
  chargeJ=Math.min(MAX_J,chargeJ+Math.min(requested,accepted));persist();render();status('TRANSFERRED '+Math.round(accepted)+' J FROM SHIP');
  return accepted;
 }
 function begin(){
  if(busy)throw Error('Scanner already acquiring');
  if(!available())throw Error('Scanner requires EVA on a landed solid world');
  const s=spec(mode),req=cost(mode),ctx=RT.scienceContext();
  if(chargeJ<req)throw Error('Multitool charge too low: '+Math.round(req)+' J required');
  if(ctx.altitudeM>s.maxAltitudeM)throw Error(s.name+' requires altitude ≤ '+s.maxAltitudeM+' m');
  const now=performance.now();
  if(now-lastStart<COOLDOWN_MS)throw Error('Scanner needs to cool down');
  busy=true;lastStart=now;active={instrument:mode,bodyId:ctx.bodyId,local:ctx.local.slice(),simTime:ctx.simTime};
  pulseUntil=now+s.seconds*1000+650;render();
  status('ACQUIRING '+s.name.toUpperCase()+' · stand within sensor range');
  setTimeout(()=>{
   const job=active;active=null;
   try{
    const after=RT.scienceContext();
    if(!job||!available()||after.bodyId!==job.bodyId)throw Error('Scan cancelled: EVA location or planetary body changed');
    const arc=root.StarfallEcology?.arc;
    if(arc&&arc(after.local,job.local,after.body.radius)>3)throw Error('Scan cancelled: moved more than 3 scene units');
    // The existing 4A science controller is the sole evidence writer. It
    // annotates through T14 and persists the original robotics4 journal.
    const observation=Science.measure(job.instrument,false);
    if(!observation||!observation.id)throw Error('Authoritative instrument returned no reading');
    chargeJ=Math.max(0,chargeJ-cost(job.instrument));lastObservation=observation;
    lastVisualTarget=job.instrument==='bioassay'?visibleTarget():null;
    persist();status('SCANNED · '+observation.parameter+' = '+observation.value+' '+observation.unit);
   }catch(error){status(error.message||String(error),true);}
   finally{busy=false;render();}
  },s.seconds*1000);
  return true;
 }
 const api={MODES,MAX_J,begin,setMode,cycle,show,close,recharge,
  get chargeJ(){return chargeJ;},get mode(){return mode;},get busy(){return busy;},
  get observation(){return lastObservation;},get activeUntil(){return pulseUntil;},
  get canUse(){return available();}};
 root.StarfallMultitool9G=api;
 $('multitool9g-mode').value=mode;
 $('multitool9g-open').onclick=()=>open?close():show();
 $('multitool9g-close').onclick=close;
 $('multitool9g-mode').onchange=e=>{try{setMode(e.target.value);}catch(err){status(err.message,true);}};
 $('multitool9g-trigger').onclick=()=>{try{begin();}catch(err){status(err.message,true);}};
 $('multitool9g-recharge').onclick=()=>{try{recharge();}catch(err){status(err.message,true);}};
 $('multitool9g-journal').onclick=()=>{close();Science.open();};
 document.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
  if(e.code==='KeyZ'){if(!available())return;e.preventDefault();e.stopImmediatePropagation();try{open?begin():show();}catch(err){status(err.message,true);}}
  if(e.code==='KeyN'&&available()){e.preventDefault();e.stopImmediatePropagation();try{cycle();}catch(err){status(err.message,true);}}
  if(e.code==='Escape'&&open){e.stopImmediatePropagation();close();}
 },true);
 setInterval(()=>{if(open||available())render();},400);
 render();
})(globalThis);
