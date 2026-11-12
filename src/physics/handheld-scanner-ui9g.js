/* STARFALL 9G — hand-held suit multitool UI.
 * Uses the original 4A field instrument path and canonical ScienceUI journal.
 * A real ship power debit is required for recharging a depleted tool cell.
 */
(function(root){'use strict';
const M=root.StarfallHandheldScanner9G,S=root.StarfallFieldScience,RT=root.StarfallRuntime,Science=root.StarfallScienceUI;
const $=id=>document.getElementById(id);
if(!M||!S||!RT||!Science||!$('multitool9g'))throw Error('9G scanner requires 4A field science, journal, runtime and HUD');
const panel=$('multitool9g'),modeSelect=$('mt9g-mode'),scanButton=$('mt9g-scan'),chargeButton=$('mt9g-charge'),
 energyFill=$('mt9g-energy'),batteryLabel=$('mt9g-battery'),readout=$('mt9g-readout'),
 targetLabel=$('mt9g-target'),progress=$('mt9g-progress');
let state=M.sanitize(SF.load()?.multitool9g),job=null,aimed=null,
 lastMessage='',lastError=false,paintClock=0,wasVisible=false;
const costFor=key=>{const instrument=M.mode(key).instrument,spec=S.INSTRUMENTS[instrument];return spec&&spec.seconds*spec.powerW;};
function save(){SF.save({multitool9g:{...state}});}
function available(){const ctx=RT.outpostContext();
 return !!(ctx?.body?.landable&&ctx.landed&&ctx.eva&&!RT.truckOccupied&&
  !RT.manufacturedOccupied8G&&!RT.interiorState&&RT.eva);
}
function message(text,error=false){lastMessage=String(text).slice(0,400);lastError=error;paint(true);}
function context(){return RT.outpostContext();}
function snapshotTarget(ctx){
 if(!ctx?.position||!ctx?.forward||!root.StarfallEcologyUI?.scene)return null;
 return M.selectTarget(root.StarfallEcologyUI.scene(),ctx.position,ctx.forward);
}
function start(){
 if(!available()){message('Leave your ship or vehicle in EVA before using the multitool.',true);return false;}
 if(job){message('A reading is already acquiring.');return false;}
 try{
  const ctx=context(),selected=M.mode(state.mode),spec=S.INSTRUMENTS[selected.instrument];
  job=M.begin(state,{...ctx,manufacturedOccupied:RT.manufacturedOccupied8G},spec);
  // Only the biodiversity overlay is a modelled visual sighting. The actual
  // reading remains the canonical local 4A field instrument observation.
  aimed=selected.key==='life'?snapshotTarget(ctx):null;
  job.target=aimed;
  message('ACQUIRING '+selected.label+' · '+spec.seconds+' s · '+job.powerJ+' J',false);
  return true;
 }catch(e){job=null;message(e.message,true);return false;}
}
function cancel(reason='Acquisition cancelled'){
 if(!job)return;
 job=null;aimed=null;message(reason,true);
}
function finish(){
 const ready=job;if(!ready)return;
 try{
  const ctx=context(),step=M.advance(ready,0,{...ctx,manufacturedOccupied:RT.manufacturedOccupied8G},ctx.body.radius);
  if(step.status==='cancelled')throw Error(step.reason);
  // Canonical 4A acquisition and the existing ScienceUI journal; it is the
  // same observation path used by the original Field Laboratory controls.
  const reading=Science.measure(ready.instrument,false);
  state=M.record(state,reading,ready,aimed);
  save();
  const value=Number(reading.value).toLocaleString('en-US',{maximumFractionDigits:5});
  const uncertain=Number(reading.uncertainty).toLocaleString('en-US',{maximumFractionDigits:4});
  const label=M.mode(state.mode).label;
  lastMessage=label+' · '+value+' '+reading.unit+' ± '+uncertain+
   (aimed?' · '+aimed.kind.toUpperCase()+' candidate '+aimed.rangeScene.toFixed(1)+'u':'')+
   '\n'+reading.quality+' / '+reading.model+' · journal '+reading.id;
  lastError=false;
 }catch(e){lastMessage='Scan failed: '+e.message;lastError=true;}
 finally{job=null;aimed=null;paint(true);}
}
function setMode(key){
 if(job){message('Finish the current reading before switching modes.',true);return;}
 state={...state,mode:M.mode(key).key};save();
 message(M.mode(state.mode).label+' · '+M.mode(state.mode).purpose+'.',false);
}
function cycle(){setMode(M.nextMode(state.mode).key);}
function recharge(){
 if(!available()){message('Approach your landed ship in EVA to recharge.',true);return;}
 if(job){message('Stop the acquisition before recharging.',true);return;}
 try{
  const needed=Math.max(0,Math.ceil(M.CAPACITY_J-state.batteryJ));
  if(needed<1){message('Multitool cell already fully charged.');return;}
  const paid=RT.rechargeHandheldScanner9G(needed);
  state=M.applyCharge(state,paid);save();
  message('Recharged +'+paid.toLocaleString('en-US')+' J from your ship battery. Remaining '+Math.round(state.batteryJ)+' J.');
 }catch(e){message(e.message,true);}
}
function paint(force=false){
 if(!force&&!wasVisible)return;
 panel.hidden=!available();wasVisible=!panel.hidden;
 if(panel.hidden)return;
 modeSelect.value=state.mode;modeSelect.disabled=!!job;
 const selection=M.mode(state.mode),cost=costFor(state.mode)||0;
 const remaining=state.batteryJ;
 energyFill.style.width=(100*remaining/M.CAPACITY_J).toFixed(1)+'%';
 batteryLabel.textContent=Math.round(remaining).toLocaleString('en-US')+' / '+M.CAPACITY_J.toLocaleString('en-US')+' J';
 scanButton.textContent=job?'SCANNING '+Math.round(job.elapsed/job.seconds*100)+'%':'SCAN · '+cost+' J';
 scanButton.disabled=!!job||remaining+1e-9<cost;
 chargeButton.disabled=!!job||remaining>=M.CAPACITY_J;
 progress.style.width=(job?100*job.elapsed/job.seconds:0).toFixed(1)+'%';
 const target=job?.target;
 targetLabel.textContent=target?'TARGET · '+target.kind.toUpperCase()+' · '+target.rangeScene.toFixed(1)+'u · visual candidate':
  'AIM · '+selection.purpose+' · sample at your EVA position';
 readout.style.color=lastError?'#ffb9ab':'#d7f7de';
 if(lastMessage)readout.textContent=lastMessage;
 else if(state.history.length){
  const last=state.history[state.history.length-1];
  readout.textContent='LAST · '+last.instrument.toUpperCase()+' = '+last.value+' '+last.unit+
   '\n'+last.model+' · '+last.id;
 }else readout.textContent='SUIT MULTITOOL READY · choose a sensor and press SCAN';
}
for(const m of M.MODES){const option=document.createElement('option');option.value=m.key;option.textContent=m.label+' — '+m.purpose;modeSelect.append(option);}
modeSelect.onchange=()=>setMode(modeSelect.value);
scanButton.onclick=start;chargeButton.onclick=recharge;
$('mt9g-journal').onclick=()=>Science.open();
function tick(dt){
 // The original game frame clock drives progress, not accelerated planetary
 // simulation time. No fake timer continues when gameplay is paused.
 if(job){
  const ctx=context();
  const result=M.advance(job,dt,{...ctx,manufacturedOccupied:RT.manufacturedOccupied8G},ctx.body?.radius||1);
  if(result.status==='cancelled')cancel(result.reason);
  else if(result.job){job=result.job;if(result.status==='ready')finish();}
 }
 paintClock+=Math.max(0,Math.min(.1,dt||0));
 if(paintClock>.13||wasVisible!==available()){paintClock=0;paint(true);}
}
addEventListener('keydown',ev=>{
 if(ev.repeat||ev.ctrlKey||ev.altKey||ev.metaKey||!available()||!['KeyP','KeyO'].includes(ev.code))return;
 const target=ev.target;
 if(target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
 if([...document.querySelectorAll('[role=dialog][aria-modal=true]')].some(el=>!el.hidden&&el.getClientRects().length>0))return;
 ev.preventDefault();if(ev.code==='KeyP')start();else cycle();
});
root.StarfallMultitoolUI9G={tick,start,cycle,recharge,get isScanning(){return !!job;},
 get mode(){return state.mode;},get batteryJ(){return state.batteryJ;},
 get status(){return{...state,job:job?{...job}:null,lastMessage,visible:available()};}};
paint(true);
})(globalThis);
