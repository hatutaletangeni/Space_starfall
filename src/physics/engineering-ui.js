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
 const parent=$('systems-loads');parent.replaceChildren();for(const name of ['avionics','radiator','drive','lights','instruments']){const l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.checked=st.loads[name]!==false;c.onchange=()=>{Store.setLoad(selected,name,c.checked);RT.persistVehicles();refreshSystems();};l.append(c,document.createTextNode(' '+name.toUpperCase()));parent.append(l);}
}
function edit(kindName='ship'){kind=kindName;draft=Store.get(kind).definition;history=[];$('wb-vehicle').value=kind;showDraft();}
function saveHistory(){if(draft){history.push(M.clone(draft));if(history.length>20)history.shift();}}
function showDraft(){const list=$('wb-slots'),box=$('wb-preview');list.replaceChildren();box.replaceChildren();status('');
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
function apply(){try{const result=RT.configureVehicle(kind,draft);status('APPLIED · Dry mass '+format(result.next.dryMassKg)+' kg; saved.',true);edit(kind);refreshSystems();}catch(e){status(e.message);}}
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
$('wb-save').onclick=()=>{if(M.validate(draft).length){status('Cannot save an invalid design.');return;}const saved=SF.load().engineeringDesigns||{};saved[kind]=M.clone(draft);SF.save({engineeringDesigns:saved});status('Design saved locally for '+kind+'.',true);};
$('wb-load').onclick=()=>{const saved=SF.load().engineeringDesigns?.[kind];if(!saved){status('No saved design for '+kind+'.');return;}if(M.validate(saved).length){status('Saved design is invalid; no changes made.');return;}saveHistory();draft=M.clone(saved);showDraft();};
$('wb-export').onclick=()=>{if(M.validate(draft).length){status('Cannot export an invalid assembly.');return;}download('starfall-'+kind+'-engineering-design.json',JSON.stringify({schema:'starfall-engineering-1',definition:draft,stats:M.evaluate(draft)},null,2));status('Design exported.',true);};
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('workbench').hidden){$('workbench').hidden=true;e.stopImmediatePropagation();}});
setInterval(()=>{if(!document.hidden&&!$('systems-inner').hidden)refreshSystems();},1200);
root.StarfallEngineeringUI={open:()=>{$('workbench-open').click();},preview:()=>M.validate(draft),get draft(){return M.clone(draft)}};
})(globalThis);
