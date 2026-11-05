/* STARFALL Update 8H — compact Engineer / Industry owner-flow inspector.
 * Reads original 8A/8C/8D/8E/8F/T02 owners via StarfallRuntime; never
 * fabricates, debits, moves, charges, lands, rewrites or creates a parallel
 * factory database. User manually refreshes after meaningful actions.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host)return;
const section=document.createElement('section');
section.className='section';section.id='industry8h-flow-panel';
section.setAttribute('aria-label','Physical industry and logistics material flow inspector');
const title=document.createElement('div');title.className='section-title';
title.textContent='PHYSICAL INDUSTRY · MATERIAL FLOW AUDIT';
const note=document.createElement('p');note.className='panel-note';
note.textContent='All numbers below come from the original saved 8A stock and paid physical machinery. A conveyor packet, truck route or offworld manifest proves only its recorded status. Surface depots do NOT feed the ship smelter automatically: personally drive the original truck to collect depot stock, bring it to the landed ship, operate the paid 8D cargo loader, then run 8E refining, 8F fabrication and 8G assembly.';
const refreshButton=document.createElement('button');
refreshButton.type='button';refreshButton.id='industry8h-refresh';
refreshButton.className='science-action';
refreshButton.textContent='REFRESH ORIGINAL INDUSTRY LEDGER';
const top=document.createElement('p');top.className='panel-note';
top.id='industry8h-summary';top.setAttribute('role','status');
const flow=document.createElement('div');flow.id='industry8h-stages';
flow.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:8px;min-width:0';
const details=document.createElement('pre');
details.id='industry8h-details';
details.style.cssText='white-space:pre-wrap;overflow:auto;max-height:320px;background:#101a22;border:1px solid #806e4466;padding:10px;color:#d9d5c8;font:11px/1.55 Consolas,monospace';
const status=document.createElement('p');status.className='panel-note';
status.id='industry8h-status';status.setAttribute('role','status');
section.append(title,note,refreshButton,top,flow,details,status);
host.append(section);
const safe=n=>Number.isFinite(n)?n.toLocaleString(undefined,
 {maximumFractionDigits:3}):'NOT VERIFIED';
const fmt=l=>String(l||'UNKNOWN').replaceAll('_',' ');
const badge=(name,state,detail)=>{
 const card=document.createElement('div');
 card.style.cssText='background:#111e29;border:1px solid #76694d77;border-radius:6px;padding:8px;min-width:0';
 const title=document.createElement('strong');title.textContent=name;
 title.style.cssText='display:block;color:#e9d49c;font-size:12px;overflow-wrap:anywhere';
 const status=document.createElement('div');status.textContent=fmt(state);
 status.style.cssText='color:#f2f0e9;font:11px/1.4 Consolas,monospace;margin-top:4px;overflow-wrap:anywhere';
 const desc=document.createElement('div');desc.textContent=detail;
 desc.style.cssText='font-size:11px;line-height:1.45;color:#afb5b9;margin-top:5px';
 card.append(title,status,desc);return card;
};
function refresh(){
 try{
  const rt=root.StarfallRuntime;
  if(!rt?.industryFlowContext8H)throw Error('Original source-owner industry interface unavailable');
  const q=rt.industryFlowContext8H();
  const t=q.totals;
  top.textContent='REAL 8A INVENTORY '+safe(t.totalMassKg)+' kg / '+t.lotCount+
   ' material lots · ACTUAL TRUCK '+safe(t.truckKg)+' kg · SHIP '+safe(t.shipKg)+
   ' kg · INSTALLED DEPOTS '+t.realDepots+' · PAID DRIVES '+t.realDrives+
   ' · 8MPa PIPES '+t.installedPipes+' · RATED VESSELS '+t.realGasVessels;
  const cards=q.stages.map(x=>badge(x.id,x.state,x.help));
  flow.replaceChildren(...cards);
  const lines=[
   'ORIGINAL OWNER        '+q.sourceOwner,
   'CURRENT WORLD         '+(q.worldId||'NONE · SHIP MAY BE IN SPACE'),
   'ALL ORIGINAL LOTS     '+t.lotCount+' · '+safe(t.totalMassKg)+' kg / '+safe(t.totalVolumeM3)+' m³',
   'TRUCK / SHIP / DEPOT  '+safe(t.truckKg)+' / '+safe(t.shipKg)+' / '+safe(t.depotKg)+' kg',
   'ACTUAL SOURCE PATH    SURVEY → 8D EXTRACT → DRIVE TRUCK → SHIP LOADER → 8E → 8F → 8G → MANUAL SHIP FLIGHT',
   'NOT A GRAPH TELEPORT  Surface depot stock MUST return through original 8H depot pickup → original driven truck → real 8D ship loading',
   'LIVE BELT / GAS       '+t.liveConveyor+' / '+t.liveGas+' jobs with source-owned physical custody',
   'OFFWORLD              '+t.deliveredOffworld+' RECEIPT(S) / '+t.offworldJobs+' manifest(s)',
   '',
   'ACTUAL PHYSICAL 8A CONVEYOR / RATED PIPE CUSTODY:'
  ];
  if(!q.connections.length)lines.push('  No currently archived local certified packet path. A UI wire or icon does NOT move matter.');
  for(const j of q.connections.slice(-36))
   lines.push('  '+j.kind+' '+j.id+' · '+j.state+' · '+safe(j.massKg)+' kg '+j.materialId+
    ' · stage '+j.stage+' · '+(j.sourcePaid&&j.realCustody?'REAL 8A CUSTODY':'INVALID CUSTODY')+
    ' · '+j.path.join(' → ')+' · '+j.note);
  lines.push('','EXISTING PHYSICAL 8A CONTAINERS:');
  for(const c of q.locations.filter(x=>x.massKg>0).slice(0,45)){
   lines.push('  '+c.id+' · '+safe(c.massKg)+'/'+safe(c.capacityKg)+' kg · '+safe(c.volumeM3)+
    '/'+safe(c.maxVolumeM3)+' m³ · '+(c.certified?'PAID/ORIGINAL':'OWNER NOT VERIFIED'));
   for(const m of c.materials.slice(0,7))
    lines.push('     '+m.type+' '+safe(m.massKg)+'kg  ['+m.id+']  source:'+m.provenance);
  }
  lines.push('','ACTIONABLE FAULTS / INCOMPLETE LINKS:');
  if(!q.faults.length)lines.push('  No source-owner mismatch detected. This does NOT verify a full manufacturing expedition.');
  for(const f of q.faults.slice(0,35))
   lines.push('  '+f.severity.toUpperCase()+' '+f.code+': '+f.reason);
  lines.push('','EVIDENCE NOTICE: This is a bounded snapshot inspector, not proof of a flown end-to-end rocket mission or 8I/8J terraforming.');
  details.textContent=lines.join('\n');
  status.textContent='Read-only snapshot from current original game owners. Total mass and job states are INSPECTED, not created or delivered.';
  return q;
 }catch(e){
  status.textContent='Industry owner audit unavailable: '+String(e.message||e);
  return null;
 }
}
refreshButton.addEventListener('click',refresh);
refresh();
root.StarfallIndustryFlowUI8H=Object.freeze({refresh});
})(globalThis);
