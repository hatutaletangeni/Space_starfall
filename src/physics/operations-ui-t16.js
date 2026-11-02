/* STARFALL T16 — compact operations cards, no second UI owner/state.
 * Installed after all authoritative UI modules, including T03. No save writes.
 */
(function(root){'use strict';
const M=root.StarfallOperationsT16,$=id=>document.getElementById(id),RT=root.StarfallRuntime;
if(!M||!RT||!$('panel-body'))return;
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const num=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'NOT RECORDED';
const clean=x=>String(x??'').slice(0,220);
const words=(x,fallback='NOT RECORDED')=>x===null||x===undefined||x===''?fallback:String(x);
const panelIds={main:'panel-body',launch:'launch-dialog',sat:'sat7c-section',outpost:'outpost',
 photos:'imaging7f',field:'field-lab',workbench:'workbench',assets:'asset-manager',research:'research7e'};
const cards=new Map();
function initCards(){
 for(const [k,id] of Object.entries(panelIds)){
  const parent=$(id);if(!parent)continue;
  const block=make('section',undefined,'op16-card');block.dataset.owner=k;
  block.setAttribute('aria-label',k==='main'?'Technology operating status':'Selected equipment source status');
  const title=make('h3','OPERATIONS / ACTUAL STATUS','op16-title'),body=make('div','Select a real asset.','op16-body');
  block.append(title,body);
  if(k==='main'){
   const wrap=make('div',undefined,'op16-tools'),sel=make('select');sel.id='op16-asset';sel.setAttribute('aria-label','Inspect an installed asset');
   const b=make('button','OPEN ORIGINAL CONTROLS','science-action');b.id='op16-open';b.type='button';
   const refresh=make('button','REFRESH','science-action');refresh.type='button';
   wrap.append(sel,b,refresh);block.insertBefore(wrap,body);
   sel.onchange=()=>refreshAll(true);
   b.onclick=()=>openOwner(sel.value);
   refresh.onclick=()=>refreshAll(true);
   const log=make('section',undefined,'op16-log');log.setAttribute('aria-label','Real operational event log');
   log.append(make('h3','RECENT MISSION / EQUIPMENT LOG','op16-title'));
   const bar=make('div',undefined,'op16-tools');
   for(const [name,label] of [['asset','Asset'],['severity','Severity'],['mission','Mission']]){
    const l=make('label',label),s=make('select');s.id='op16-filter-'+name;s.setAttribute('aria-label',label+' filter');s.onchange=renderLog;
    l.append(s);bar.append(l);
   }
   const out=make('div',undefined,'op16-log-rows');out.id='op16-log-rows';log.append(bar,out);block.append(log);
  }
  if(k==='main')parent.insertBefore(block,parent.firstChild);
  else {
   // Keep original modal headings, controls, pages, and button IDs.
   const host=parent.querySelector('.obs-window,.launch-window,.asset-window')||parent;
   const header=host.querySelector('.obs-head,.launch-head,.asset-head');
   if(header)header.insertAdjacentElement('afterend',block);
   else host.insertBefore(block,host.firstChild);
  }
  cards.set(k,{block,body,last:''});
 }
}
const realAssets=()=>{
 const list=[],ids=new Set(),push=(id,kind,bodyId=null,systemId=null)=>{
  if(typeof id!=='string'||!id||ids.has(id))return;
  ids.add(id);list.push({id,kind,bodyId,systemId});
 };
 push('starfall-ship','ship',RT.engineeringAssetPoses?.().shipPose?.bodyId,RT.nearest?.systemId);
 push('starfall-rover','rover',RT.engineeringAssetPoses?.().roverPose?.bodyId,RT.nearest?.systemId);
 const t=RT.truck;if(t?.bodyId)push('starfall-truck','truck',t.bodyId,null);
 for(const r of root.StarfallLaunchUI?.store?.rovers||[])push(r.id,'remote-rover',r.bodyId,r.systemId);
 for(const s of root.StarfallLaunchUI?.store?.satellites||[])push(s.id,'satellite',s.bodyId,s.systemId);
 for(const a of root.StarfallOutpostUI?.store?.items||[])push(a.id,a.kind||'outpost',a.bodyId,a.systemId);
 for(const a of root.StarfallLaunchUI?.store?.launches||[])push(a.id,'rocket',a.bodyId,a.systemId);
 return list;
};
function report(id){
 const a=realAssets().find(x=>x.id===id);if(!a)return null;
 const time=RT.time,ship=RT.vehicleStore?.get('ship'),rover=RT.vehicleStore?.get('rover'),
  launch=root.StarfallLaunchUI?.store,photos=root.StarfallImagingUI7F?.store,
  packet=M.packetFor(id,root.StarfallCommsT03?.transport?.packets||[]);
 const list=photos?.photos?.filter(p=>p.sourceAssetId===id)||[],last=list.at(-1)||null,
  job=photos?.jobs?.filter(j=>j.assetId===id).at(-1)||null;
 const realParent=root.StarfallEngineering7AUI?.registry?.assets?.get(id)?.parentId||null;
 const common={id,kind:a.kind,bodyId:a.bodyId,systemId:a.systemId,parentId:realParent,localTimeS:time,packet,photo:last,job,
  pendingFiles:list.filter(x=>x.status!=='downlinked').length,
  sourceModel:'SIMULATED / ORIGINAL SOURCE OWNER; no laboratory certification'};
 if(['ship','rover'].includes(a.kind)){
  const v=a.kind==='ship'?ship:rover,eng=RT.engineeringSystemReport?.()?.[a.kind],st=v?.state,s=v?.stats;
  const deployed=a.kind==='ship'||!!RT.engineeringAssetPoses?.().roverPose;
  return M.status({...common,energyJ:st?.energyJ,capacityJ:s?.batteryCapacityJ,health:st?.health,
   powered:st?.powerEnabled?!(eng?.shed||[]).includes('avionics'):null,
   fault:deployed?null:'Rover remains onboard / no world-fixed surface pose; deploy before field commands.',
   temperatureK:st?.temperatureK,supplyW:eng?.generated?.totalW,loadW:eng?.totalLoadW,
   mode:st?.powerEnabled?'ENGINEERING BUS':'LEGACY OPTIONAL POWER MODEL',
   limits:'Rated loads modeled; fictional fuel-independent generator. Actual ship ramp and local rover autonomy unchanged.',
   remoteTimeS:null});
 }
 if(a.kind==='truck'){
  const t=RT.truck;
  return M.status({...common,energyJ:t?.batteryJ,capacityJ:root.StarfallTruck7D?.CONFIG?.batteryCapacityJ,
   powered:t?.bodyId?true:null,mode:t?.occupied?'DRIVING':'PARKED',
   limits:'Physical X truck boarding, finite recovery/charge and T12 service. No remote truck commands.'});
 }
 if(a.kind==='remote-rover'){
  const r=launch?.rovers.find(x=>x.id===id),lnk=r&&root.StarfallLaunchUI?.remoteLink?.(r,time);
  const hw=r?.ground7d,com=root.StarfallCommsT03?.status?.(id);
  return M.status({...common,energyJ:r?.batteryJ,capacityJ:22e6,health:r?.roverT06?.health??null,
   powered:r?.batteryJ>0&&r?.status!=='fault',mode:r?.status,
   storageUsed:r?.records?.length??0,storageMax:r?.ground7d?.scienceMax??null,
   remoteTimeS:hw?.lastTickS,signal:lnk?{connected:!!lnk.connected,reason:lnk.reason||'No measured route',
    delayS:Number.isFinite(lnk.delayS)?lnk.delayS:null,route:lnk.route||null}:null,
   limits:'Remote STOP requires route and ACK. Deployed rover continues an approved onboard program in blackout.'});
 }
 if(a.kind==='satellite'){
  const s=launch?.satellites.find(x=>x.id===id),o=s?.ops7c;
  return M.status({...common,energyJ:o?.energyJ??s?.powerJ,capacityJ:o?.capacityJ??root.StarfallSatelliteOps7C?.CONFIG?.capacityJ,
   powered:o?o.enabled===true&&o.radioEnabled===true:null,temperatureK:o?.temperatureK,
   supplyW:o?.lastSolarW,loadW:o?.lastLoadW,storageUsed:o?.storage?.length,
   storageMax:root.StarfallSatelliteOps7C?.CONFIG?.storageMax,
   remoteTimeS:o?.lastS,mode:o?.enabled===false?'STANDBY':'OPERATING',
   signal:o?.lastLink||null,
   limits:'7C observations are seeded numeric readings, NOT 7F photographs. Predict next orbital pass using original console.'});
 }
 const item=root.StarfallOutpostUI?.store?.items?.find(x=>x.id===id);
 if(item){
  const rep=root.StarfallOutpostUI?.powerReports?.get(item.bodyId)?.byId?.[id];
  return M.status({...common,energyJ:item.energyJ,capacityJ:root.StarfallOutposts?.SPECS?.[item.kind]?.capacityJ,
   health:item.condition,powered:rep?rep.power===true&&item.enabled!==false:null,
   supplyW:rep?.generatedW,loadW:rep?.drawW??rep?.consumedW,temperatureK:item.temperatureK,
   mode:item.enabled===false?'STANDBY':item.kind==='lab'&&item.t10?.analysis?.some(j=>j.status==='FAULT')?'FAULT':'CONNECTED HARDWARE',
   storageUsed:item.samples?.length??item.t10?.samples?.length??null,
   storageMax:root.StarfallOutposts?.SPECS?.[item.kind]?.storageMax??null,
   remoteTimeS:null,limits:'Solar 48 V bus requires actual wire graph; remote link needs real commissioned antenna and LOS.'});
 }
 const rocket=launch?.launches.find(x=>x.id===id);
 if(rocket)return M.status({...common,powered:null,mode:rocket.status||'RECORDED MISSION',
   energyJ:null,remoteTimeS:rocket.flight?.lastS??null,limits:'Original 7B rocket integration; no telemetry inferred from an unloaded mission.'});
 return null;
}
function selected(k){
 if(k==='main')return $('op16-asset')?.value;
 if(k==='launch')return $('launch-probe')?.value||$('launch-7b-active')?.value||'starfall-ship';
 if(k==='sat')return $('sat7c-list')?.value||root.StarfallSatelliteOpsUI?.selected;
 if(k==='photos'){
  const key=$('imaging7f-source')?.value||'';
  return key.startsWith('remote:')||key.startsWith('satellite:')?key.split(':').slice(1).join(':'):
   key.startsWith('local:')?'starfall-rover':key==='rover'?'starfall-rover':key;
 }
 if(k==='field')return 'starfall-rover';
 if(k==='workbench')return $('wb-vehicle')?.value==='rover'?'starfall-rover':'starfall-ship';
 if(k==='assets')return root.StarfallAssetUI7A1?.selectedId;
 if(k==='research')return $('research7e-vehicle')?.value==='ship'?'starfall-ship':'starfall-rover';
 if(k==='outpost')return $('outpost-radio-device')?.value||$('outpost-lab')?.value||$('outpost-selected')?.value||null;
 return null;
}
function addRow(parent,title,value,detail=''){
 const r=make('div',undefined,'op16-row');r.append(make('span',title),make('strong',words(value)));
 if(detail)r.append(make('small',detail));parent.append(r);
}
function fillCard(card,s){
 const target=card.body;target.replaceChildren();
 if(!s){target.append(make('p','No source-owned installed asset selected. Build/deploy one or use Asset Manager.','op16-note'));return;}
 const phase=make('p',s.stage==='FAILED'||s.warnings.length?'CHECK · '+M.stage[s.stage]:M.stage[s.stage],'op16-state');
 phase.dataset.stage=s.stage;target.append(phase);
 addRow(target,'SOURCE',s.id+' / '+s.kind);
 addRow(target,'LOCATION',(s.bodyId||'UNRESOLVED')+' · '+(s.systemId||'SYSTEM UNKNOWN')+(s.parentId?' · PARENT '+s.parentId:''));
 addRow(target,'ELECTRICAL',s.statusText+' · '+(s.energyJ===null?'ENERGY NOT MODELED':num(s.energyJ,0)+' J')+
  (s.capacityJ!==null?' / '+num(s.capacityJ,0)+' J':''),
  'Supply '+num(s.supplyW,0)+' W · load '+num(s.loadW,0)+' W (source model)');
 addRow(target,'CLOCK',M.time(s.localTimeS)+' local / '+M.time(s.remoteTimeS)+' remote',
  s.remoteLagS===null?'Remote timestamp not available; not zero delay':'Last known remote clock lag '+num(s.remoteLagS,1)+' s');
 if(s.signal)addRow(target,'RADIO',s.signal.connected===false?'NO LIVE CONTACT':s.signal.connected===true?'LINK AVAILABLE':'LAST OBSERVED LINK',
  clean(s.signal.reason||'No detailed radio-quality estimate')+' · route '+words(s.signal.route?.join?.(' → ')||s.signal.route,'NOT RECORDED')+' · delay '+(Number.isFinite(s.signal.delayS)?num(s.signal.delayS,4)+' s':'NOT RECORDED'));
 addRow(target,'LAST T03',s.packet.label+(s.packet.route?' · '+s.packet.route:''),
  'ACK '+M.time(s.packet.receivedS)+' · delay '+(s.packet.delayS===null?'NOT RECORDED':num(s.packet.delayS,4)+' s')+
  ' · quality '+(s.packet.quality===null?'NOT RECORDED':num(s.packet.quality,3))+
  ' · bytes '+num(s.packet.sentBytes,0)+'/'+num(s.packet.totalBytes,0)+' · '+s.packet.reason);
 addRow(target,'CAMERA',s.photo.label+' · '+num(s.pendingFiles,0)+' pending files',
  s.photo.reason+' · received '+M.time(s.photo.receivedS));
 if(s.storageUsed!==null)addRow(target,'ONBOARD DATA',num(s.storageUsed,0)+' / '+num(s.storageMax,0)+' records');
 if(s.health!==null||s.temperatureK!==null)addRow(target,'EQUIPMENT',
  'Health '+(s.health!==null?num(s.health*100,0)+'%':'UNMEASURED')+
  ' · thermal '+(s.temperatureK!==null?num(s.temperatureK,1)+' K':'UNMEASURED'));
 target.append(make('p','LIMITS · '+s.limits+' · '+s.sourceModel,'op16-note'));
 if(s.warnings.length||s.recommendations.length){
  const warn=make('div',undefined,'op16-warnings');
  for(const w of s.warnings)warn.append(make('p','⚠ '+w));
  for(const x of s.recommendations)warn.append(make('p','RECOVER · '+x));
  target.append(warn);
 }else target.append(make('p','READY to use the original controls. An idle asset has no fabricated ACK or instrument result.','op16-note'));
 if(s.kind==='satellite')target.append(make('p','NEXT CONTACT · Not predicted here; use PREDICT NEXT ORBIT / ECLIPSE / LINK in Satellite Operations.','op16-note'));
}
function openOwner(id){
 const obj=realAssets().find(a=>a.id===id),say=$('op16-action-result');
 if(!obj){if(say)say.textContent='No installed source asset; nothing opened.';return false;}
 let ok=false;
 if(obj.kind==='satellite'){
  ok=!!root.StarfallSatelliteOpsUI?.open;
  if(ok)root.StarfallSatelliteOpsUI.open(id);
 }else if(obj.kind==='remote-rover'||obj.kind==='rocket'){
  ok=!!root.StarfallLaunchUI?.open;
  if(ok){
   root.StarfallLaunchUI.open();
   const idSel=obj.kind==='remote-rover'?'launch-probe':'launch-7b-active';
   if($(idSel)&&[...$(idSel).options].some(o=>o.value===id)){$(idSel).value=id;$(idSel).dispatchEvent(new Event('change',{bubbles:true}));}
  }
 }else if(obj.kind==='ship'||obj.kind==='rover'){
  ok=!!root.StarfallEngineeringUI?.open;
  if(ok){const sys=$('systems-vehicle');if(sys)sys.value=obj.kind;
   root.StarfallEngineeringUI.open();
   const wb=$('wb-vehicle');if(wb){wb.value=obj.kind;wb.dispatchEvent(new Event('change',{bubbles:true}));}}
 }else if(obj.kind==='truck'){ok=!!root.StarfallLaunchUI?.open;if(ok)root.StarfallLaunchUI.open();}
 else{ok=!!$('outpost-open');if(ok)$('outpost-open').click();}
 if(say)say.textContent=ok?'Opened the existing '+obj.kind+' operations panel. State is owned by the original module.':'This asset does not expose a command panel; use Asset Manager to inspect it.';
 if(ok)refreshAll(true); // Initial status must match the selected real asset immediately on panel open.
 return ok;
}
function labelDisabledControls(){
 // Every reported reason comes from original owner state or original
 // Workbench validation, not from a speculative T16 status flag.
 const wb=$('wb-apply');if(wb?.disabled){
  const k=$('wb-vehicle')?.value||'ship',errors=root.StarfallEngineeringUI?.preview?.()||[];
  const why=errors.length?'Invalid Workbench assembly: '+errors.slice(0,3).join('; '):
   !RT.safeToReconfigure(k)?'Land and safely park '+k+'; disconnect T13 ship umbilical or stop T12 rover service first':
   'No installable part change is currently validated';
  wb.title=why;wb.setAttribute('aria-description',why);
 }
 const pairs=[['sat7c-capture','sat7c-status'],['sat7c-downlink','sat7c-status'],
  ['imaging7f-download','imaging7f-pending'],['research7e-apply-bp','research7e-bp-note']];
 for(const [btnId,readId] of pairs){
  const el=$(btnId),src=$(readId);
  if(!el?.disabled||!src)return;
  const reason=String(src.textContent||'').trim().slice(0,190);
  if(reason){el.title=reason;el.setAttribute('aria-description',reason);}
 }
}
function renderAssetOptions(){
 const sel=$('op16-asset');if(!sel)return;
 const items=realAssets(),old=sel.value||'starfall-ship',ids=new Set(items.map(x=>x.id));
 if(sel.options.length!==items.length||items.some((v,i)=>sel.options[i]?.value!==v.id)){
  sel.replaceChildren();
  for(const a of items.slice(0,400)){const o=make('option',a.kind.toUpperCase()+' · '+a.id);o.value=a.id;sel.append(o);}
 }
 sel.value=ids.has(old)?old:'starfall-ship';
}
function eventRows(){
 const rt=RT,events=root.StarfallMissionOperationsUI?.clock?.events||[],
  receipts=root.StarfallOutpostUI?.store?.receipts||[];
 return M.events({packets:root.StarfallCommsT03?.transport?.packets||[],
  photos:root.StarfallImagingUI7F?.store?.photos||[],jobs:root.StarfallImagingUI7F?.store?.jobs||[],
  services:root.SF?.load?.()?.equipmentT15?.events||[],missions:events,labReceipts:receipts,limit:140});
}
function renderLog(){
 const list=eventRows(),control=(name,vals)=>{
  const sel=$('op16-filter-'+name);if(!sel)return'all';const old=sel.value||'all';if(sel.options.length!==vals.length||
  vals.some((v,i)=>sel.options[i]?.value!==v[0])){
   sel.replaceChildren();for(const [value,label] of vals){const o=make('option',label);o.value=value;sel.append(o);}
  }
  sel.value=vals.some(v=>v[0]===old)?old:'all';return sel.value;
 };
 const asset=control('asset',[['all','All equipment'],...new Set(list.map(x=>x.assetId)).values()].map(v=>Array.isArray(v)?v:[v,v]));
 const sev=control('severity',[['all','All severities'],['error','Fault'],['warning','Needs attention'],['info','Informational']]);
 const mission=control('mission',[['all','All missions'],...new Set(list.map(x=>x.missionId).filter(Boolean)).values()].map(v=>Array.isArray(v)?v:[v,v]));
 const filtered=M.filterEvents(list,{assetId:asset,severity:sev,missionId:mission});
 const node=$('op16-log-rows');if(!node)return;node.replaceChildren();
 if(!filtered.length){node.append(make('p','No recorded events match. This is not proof that an unobserved command succeeded.','op16-note'));return;}
 for(const e of filtered.slice(0,9)){
  const row=make('p',M.time(e.timeS)+' · '+e.severity.toUpperCase()+' · '+e.assetId+' / '+e.description+' · '+e.detail,'op16-log-line');
  row.dataset.severity=e.severity;node.append(row);
 }
}
let last=0;
function refreshAll(force=false){
 const now=performance.now();if(!force&&now-last<1500)return;last=now;
 renderAssetOptions();
 for(const [k,v] of cards){
  if(k!=='main'&&$(panelIds[k])?.hidden)continue;
  if(k==='sat'&&$('launch-dialog')?.hidden)continue;
  const id=selected(k),r=id?report(id):null;
  // Avoid expensive, repeated DOM rewrites if unchanged. Do not claim UI
  // state changes when underlying owners have not changed.
  const str=JSON.stringify(r);
  if(force||str!==v.last){fillCard(v,r);v.last=str;}
 }
 labelDisabledControls();
 if(!$('panel')?.hidden)renderLog();
}
initCards();
const output=make('p','Select original controls to perform any physical command; this T16 display is read-only.','op16-note');
output.id='op16-action-result';cards.get('main')?.block?.append(output);
function focusGuard(){
 const ids=['workbench','research7e','imaging7f','field-lab','outpost','asset-manager','launch-dialog'];
 let previous=null;
 let launcher=null;
 document.addEventListener('pointerdown',e=>{const b=e.target?.closest?.('button');if(b&&!ids.some(id=>$(id)?.contains(b)))launcher=b;},true);
 const prev=new Map();
 const observer=new MutationObserver(records=>{
  for(const r of records){
   const el=r.target,open=!el.hidden,was=prev.get(el);prev.set(el,open);
   if(open&&was===false){previous=launcher?.isConnected?launcher:document.activeElement;const c=el.querySelector('input:not([disabled]),select:not([disabled]),button:not([disabled])');
    if(c&&!el.contains(document.activeElement))c.focus({preventScroll:true});
    refreshAll(true);
   }
   if(!open&&was===true&&!ids.some(id=>$(id)&&!$(id).hidden)){
    if(previous?.isConnected&&typeof previous.focus==='function')previous.focus({preventScroll:true});
    previous=null;
   }
  }
 });
 for(const id of ids)if($(id)){prev.set($(id),!$(id).hidden);observer.observe($(id),{attributes:true,attributeFilter:['hidden']});}
 // Preserve the original Escape handlers and key remappings; trap only Tab
 // inside actually opened dialogs, never in flight or inside a text field
 // outside a dialog. This stops focus escaping behind a modal.
 document.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const active=ids.map(id=>$(id)).filter(el=>el&&!el.hidden).at(-1);
  if(!active)return;
  const nodes=[...active.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')]
   .filter(el=>!el.hidden&&el.getClientRects().length>0);
  if(!nodes.length)return;
  const first=nodes[0],last=nodes.at(-1);
  if(e.shiftKey&&(document.activeElement===first||!active.contains(document.activeElement))){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&(document.activeElement===last||!active.contains(document.activeElement))){e.preventDefault();first.focus();}
 },true);
}
focusGuard();setInterval(()=>{if(!document.hidden)refreshAll();},1800);
refreshAll(true);
root.StarfallOperationsUI16={refresh:()=>refreshAll(true),report,realAssets,openOwner,renderLog,get cards(){return cards}};
})(window);