/* STARFALL 3C/3D: purely data-driven power controls and transactional workbench. */
(function(root){'use strict';
const $=id=>document.getElementById(id),M=root.StarfallVehicles,RT=root.StarfallRuntime,Store=RT.vehicleStore;
let kind='ship',draft=null,history=[],lastError='';
const format=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
function row(parent,k,v){const el=document.createElement('div');el.className='fc-row';const a=document.createElement('span'),b=document.createElement('b');a.textContent=k;b.textContent=v;el.append(a,b);parent.append(el);}
function status(msg,success=false){lastError=msg;$('wb-error').style.color=success?'#97d3bb':'#ffb2a7';$('wb-error').textContent=msg;}
function refreshSystems(){const selected=$('systems-vehicle').value,v=Store.get(selected),report=RT.engineeringSystemReport()[selected],st=v.state,stats=v.stats,box=$('systems-readout');box.replaceChildren();
 row(box,'Total mass',format(stats.massKg)+' kg');row(box,'Fuel',format(st.fuelKg)+' / '+format(stats.fuelCapacityKg)+' kg');row(box,'Battery',format(st.energyJ/3.6e6,2)+' / '+format(stats.batteryCapacityJ/3.6e6,2)+' kWh');row(box,'Temperature',format(st.temperatureK)+' K');row(box,'Power source',report?format(report.generated.solarW+report.generated.generatorW)+' W':'Compatibility / not simulated');row(box,'Power demand',report?format(report.totalLoadW)+' W':'—');row(box,'Load shedding',report?.shed.length?report.shed.join(', '):'None');row(box,'Generator model',v.stats.generatorW>0?'FICTIONAL compact source / finite '+format(v.stats.generatorW)+' W + modeled heat (no fuel budget)':'None installed');
 $('systems-power').checked=st.powerEnabled;
 refreshShipT13();
 const parent=$('systems-loads');parent.replaceChildren();for(const name of ['avionics','radiator','drive','lights','instruments']){const l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.checked=st.loads[name]!==false;c.onchange=()=>{Store.setLoad(selected,name,c.checked);RT.persistVehicles();refreshSystems();};l.append(c,document.createTextNode(' '+name.toUpperCase()));parent.append(l);}
}
function liveT15(){
 const x=RT.equipmentSnapshotT15(kind),lines=[
 'OWNER '+x.assetId+' · '+kind.toUpperCase()+' · installed '+x.components.length+' physical module slots',
 'BATTERY '+format(x.state.energyJ,0)+' / '+format(x.stats.batteryCapacityJ,0)+' J · dry '+format(x.stats.dryMassKg,0)+' kg',
 'GENERATION '+format(x.stats.maxSolarW+x.stats.generatorW,0)+' W (rated, generator fictional)',
 'DRIVE '+format(x.stats.driveTorqueNm,0)+' N·m · traction '+format(x.stats.traction,3)+' · SHIP THRUST '+format(x.stats.thrustN,0)+' N',
 ...x.components.map(p=>p.slot.toUpperCase()+' / '+p.partId+' / '+p.status+' / '+p.reason+' / '+format(p.massKg,0)+' kg'+(p.powerW===null?'':' / '+format(p.powerW,0)+' W')),
 'LIVE FAULTS: '+(x.faults.map(f=>f.id+' '+f.severity+' / '+f.rootCause+' / '+f.service).join(' · ')||'none reported by modeled hull/power/thermal state'),
 'LATEST CHANGE: '+(x.serviceEvents.at(-1)?.id||'legacy / no T15 part changes'),
 'ROLLBACK: '+(x.backup?'Previous valid assembly available; does not refund burned electricity':'No prior applied assembly stored')
 ];
 $('wb-live-t15').textContent=lines.join('\n');
 $('wb-restore-t15').disabled=!x.backup||!RT.safeToReconfigure(kind);
}
function edit(kindName='ship'){kind=kindName;draft=Store.get(kind).definition;history=[];$('wb-vehicle').value=kind;showDraft();}
function saveHistory(){if(draft){history.push(M.clone(draft));if(history.length>20)history.shift();}}
function showDraft(){const list=$('wb-slots'),box=$('wb-preview');list.replaceChildren();box.replaceChildren();status('');
 liveT15();
 const spec=M.slots[kind];for(const [slot,type] of spec){const wrap=document.createElement('div');wrap.className='wb-slot';const label=document.createElement('label'),sel=document.createElement('select');const id='wb-slot-'+slot;label.htmlFor=id;label.textContent=slot.toUpperCase();sel.id=id;
  const options=Object.values(M.components).filter(c=>c.type===type&&((kind==='ship'&&!c.id.startsWith('rover-')&&!c.id.includes('-rover'))||(kind==='rover'&&(c.id.startsWith('rover-')||c.id.includes('-rover')||['wheels','suspension'].includes(c.type)))));
  // Type compatibility is mandatory; chassis/vehicle restrictions are checked by validator.
  for(const comp of options){const opt=document.createElement('option');opt.value=comp.id;opt.textContent=comp.id;sel.append(opt);}
  sel.value=draft.slots[slot]||'';sel.onchange=()=>{saveHistory();draft.slots[slot]=sel.value;showDraft();};const comp=M.components[draft.slots[slot]];const extra=document.createElement('small');extra.textContent=comp?format(comp.massKg)+' kg · '+type:'MISSING';wrap.append(label,sel,extra);list.append(wrap);
 }
 const errors=M.validate(draft),fuel=Store.get(kind).state.fuelKg;
 if(errors.length){status(errors.join(' · '));$('wb-apply').disabled=true;return;}
 const e=M.evaluate(draft,fuel),existing=Store.get(kind).stats;
 for(const [label,v] of [['Dry mass',format(e.dryMassKg)+' kg'],['Mass with fuel',format(e.massKg)+' kg'],['Δ mass',format(e.dryMassKg-existing.dryMassKg)+' kg'],['Centre of mass',e.centerOfMassM.map(x=>format(x,2)).join(' / ')+' m'],['Inertia Ixx',format(e.inertiaKgM2[0])+' kg·m²'],['Fuel capacity',format(e.fuelCapacityKg)+' kg'],['Battery capacity',format(e.batteryCapacityJ/3.6e6,2)+' kWh'],['Generated rated power',format(e.maxSolarW+e.generatorW)+' W'],['Avionics draw',format(e.avionicsW)+' W'],['Radiator',format(e.radiatorAreaM2)+' m²'],['Thrust',format(e.thrustN/1000)+' kN'],['Delta-v',format(e.deltaVMS)+' m/s'],['Burn time',format(e.burnSeconds)+' s'],['Drive torque',format(e.driveTorqueNm)+' N·m'],['Wheel traction',format(e.traction,2)],['Suspension travel',format(e.suspensionTravelM,2)+' m']])row(box,label,v);
 $('wb-apply').disabled=!RT.safeToReconfigure(kind);
 status(RT.safeToReconfigure(kind)?'Preview valid. Applying will update vehicle state atomically.':'Preview only. Land and park before applying.',true);
}
function download(name,data){const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),800);}
function apply(){try{const result=RT.configureVehicle(kind,draft);
 edit(kind);refreshSystems();status('T15 VERIFIED INSTALLED CHANGE '+result.serviceId+' · dry mass '+format(result.next.dryMassKg)+' kg; real capacity/torque/power updated.',true);
 }catch(e){status(e.message);liveT15();}}
let shipT13Message='';
function shipMessage(text,failed=false){
 shipT13Message=(failed?'SERVICE DENIED: ':'SERVICE: ')+String(text);
 refreshShipT13();
}
function shipObservationsT13(targetId){
 const target=RT.shipServiceTargetsT13().find(x=>x.id===targetId);
 if(!target||target.kind==='grid-battery')return[];
 if(target.kind==='local-rover')return (root.StarfallScienceUI?.journal||[]).filter(x=>x.sourceAssetId===targetId||x.probeId===targetId);
 const r=root.StarfallLaunchUI?.store?.rovers.find(x=>x.id===targetId);
 return r?.records||[];
}
function refreshShipT13(){
 const panel=$('ship-t13-panel');if(!panel)return;
 panel.hidden=$('systems-vehicle').value!=='ship';
 if(panel.hidden)return;
 const target=$('ship-t13-target'),old=target.value;
 const list=RT.shipServiceTargetsT13();
 target.replaceChildren();
 for(const item of list){
  const o=document.createElement('option');o.value=item.id;
  o.textContent=item.kind.toUpperCase()+' · '+item.id.slice(-25)+' / '+format(item.distanceScene,1)+' scene units';
  target.append(o);
 }
 const dock=RT.shipServiceSnapshotT13();
 if(list.some(x=>x.id===old))target.value=old;
 else if(dock.connectedTarget&&list.some(x=>x.id===dock.connectedTarget))target.value=dock.connectedTarget;
 if(!list.length){const o=document.createElement('option');o.value='';o.textContent='Land and approach a rover or battery';target.append(o);}
 const picker=$('ship-t13-observation'),prior=picker.value;picker.replaceChildren();
 for(const obs of shipObservationsT13(dock.connectedTarget==='none'?target.value:dock.connectedTarget).slice(-75)){
  const o=document.createElement('option');o.value=obs.id;o.textContent=(obs.instrument||obs.parameter||'reading')+' · '+obs.id.slice(-20);
  picker.append(o);
 }
 if([...picker.options].some(x=>x.value===prior))picker.value=prior;
 if(!picker.options.length){const o=document.createElement('option');o.value='';o.textContent='No source-identified rover readings';picker.append(o);}
 $('ship-t13-dock').disabled=dock.state!=='UNDOCKED'||!list.some(x=>x.id===target.value);
 $('ship-t13-undock').disabled=dock.state==='UNDOCKED';
 $('ship-t13-charge').disabled=dock.state==='UNDOCKED';
 $('ship-t13-receive').disabled=dock.state==='UNDOCKED'||!picker.value;
 const p=dock.radio;
 $('ship-t13-readout').textContent=[
  'SHIP '+(dock.landed?'LANDED':'FLIGHT / NO PORT')+' · DOCK '+dock.state+' '+dock.connectedTarget,
  'BUS '+(p.ready?p.mode:p.reason)+' · POWER '+format(dock.generationW)+' W',
  'CHARGE '+format(dock.energyJ/3.6e6,2)+' / '+format(dock.batteryCapacityJ/3.6e6,2)+' kWh · fuel '+format(dock.fuelKg)+' kg',
  'TEMP '+format(dock.temperatureK)+' K · RADIATED '+format(dock.thermalRadiatedW)+' W · HEALTH '+format(100*dock.health)+'%',
  'INSTALLED '+Object.entries(dock.installed).map(([k,v])=>k+':'+v).join(' | '),
  'LOAD SHEDDING '+(dock.shed.length?dock.shed.join(', '):'none')+' · CONNECTOR '+format(dock.connectorTemperatureK)+' K',
  'NEXT DC SESSION '+format(Math.max(0,dock.nextChargeAtS-RT.time),0)+' s · RECORD RECEIPTS '+dock.receiptCount+
  ' · SCIENCE JOURNAL '+dock.scienceJournalRecords,
  'HISTORY '+(dock.history.length?dock.history.map(x=>x.kind+' '+x.assetId).join(' / '):'none'),
  shipT13Message].join('\n');
}
$('ship-t13-target').onchange=refreshShipT13;
$('ship-t13-dock').onclick=()=>{try{const x=RT.shipDockConnectT13($('ship-t13-target').value);shipMessage('Docked '+x.connectedTarget+'; ship and rover locations unchanged');}catch(e){shipMessage(e.message,true);}};
$('ship-t13-undock').onclick=()=>{try{RT.shipDockUndockT13();shipMessage('Connector unlatched; departure re-enabled');}catch(e){shipMessage(e.message,true);}};
$('ship-t13-charge').onclick=()=>{try{const r=RT.shipDockChargeT13();shipMessage('Real DC transfer '+format(r.drawnJ,0)+' J drawn / '+format(r.deliveredJ,0)+' J credited / '+format(r.lossJ,0)+' J loss');}catch(e){shipMessage(e.message,true);}};
$('ship-t13-receive').onclick=()=>{try{
 const r=RT.shipDockReceiveT13($('ship-t13-observation').value);
 shipMessage(r.duplicate?'Already received: no double-charge or duplicate':r.receipt.id+' stored as reference to original Science Journal reading');
 }catch(e){shipMessage(e.message,true);}};
$('ship-t13-observe').onclick=()=>{try{
 const x=RT.shipThermalObserveT13();
 shipMessage('Ship onboard thermal sensor '+format(x.value,2)+' K ±'+format(x.uncertainty,1)+' K · '+x.id);
 }catch(e){shipMessage(e.message,true);}};
$('systems-toggle').onclick=()=>{$('systems-inner').hidden=!$('systems-inner').hidden;$('systems-toggle').setAttribute('aria-expanded',String(!$('systems-inner').hidden));if(!$('systems-inner').hidden)refreshSystems();};
$('systems-vehicle').onchange=refreshSystems;
$('systems-power').onchange=e=>{Store.setPower($('systems-vehicle').value,e.target.checked);RT.persistVehicles();refreshSystems();};
$('workbench-open').onclick=()=>{edit($('systems-vehicle').value);$('workbench').hidden=false;$('wb-vehicle').focus();};
$('wb-close').onclick=()=>{$('workbench').hidden=true;};
$('workbench').addEventListener('click',e=>{if(e.target===$('workbench'))$('workbench').hidden=true;});
$('wb-vehicle').onchange=e=>edit(e.target.value);
$('wb-reset').onclick=()=>{saveHistory();draft=M.clone(M.presets[kind]);showDraft();};
$('wb-undo').onclick=()=>{if(history.length){draft=history.pop();showDraft();}else status('Nothing to undo.');};
$('wb-apply').onclick=apply;
$('wb-refresh-t15').onclick=()=>liveT15();
$('wb-restore-t15').onclick=()=>{try{const r=RT.restoreVehicleT15(kind);edit(kind);refreshSystems();
 status('T15 PREVIOUS INSTALLED PARTS RESTORED '+r.serviceId+' · existing battery joules not replenished.',true);
 }catch(e){status(e.message);liveT15();}};

$('wb-save').onclick=()=>{if(M.validate(draft).length){status('Cannot save an invalid design.');return;}const saved=SF.load().engineeringDesigns||{};saved[kind]=M.clone(draft);SF.save({engineeringDesigns:saved});status('Design saved locally for '+kind+'.',true);};
$('wb-load').onclick=()=>{const saved=SF.load().engineeringDesigns?.[kind];if(!saved){status('No saved design for '+kind+'.');return;}if(M.validate(saved).length){status('Saved design is invalid; no changes made.');return;}saveHistory();draft=M.clone(saved);showDraft();};
$('wb-export').onclick=()=>{if(M.validate(draft).length){status('Cannot export an invalid assembly.');return;}download('starfall-'+kind+'-engineering-design.json',JSON.stringify({schema:'starfall-engineering-1',definition:draft,stats:M.evaluate(draft)},null,2));status('Design exported.',true);};
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('workbench').hidden){$('workbench').hidden=true;e.stopImmediatePropagation();}});
setInterval(()=>{if(!document.hidden&&!$('systems-inner').hidden)refreshSystems();},1200);
root.StarfallEngineeringUI={open:()=>{$('workbench-open').click();},preview:()=>M.validate(draft),get draft(){return M.clone(draft)}};
})(globalThis);
