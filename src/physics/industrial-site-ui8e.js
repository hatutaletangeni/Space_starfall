/* STARFALL 8E — physical site erection + actual reaction station.
 * It uses the source game's Engineer panel, not a fake inventory. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallIndustrialSite8E)return;
const rt=()=>root.StarfallRuntime;
const box=document.createElement('section');box.className='section';box.id='industrial8e-physical';
const label=(t)=>{const el=document.createElement('div');el.className='section-title';el.textContent=t;return el;};
const p=(txt)=>{const el=document.createElement('p');el.className='panel-note';el.textContent=txt;return el;};
const choose=()=>{const x=document.createElement('select');x.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';return x;};
const input=(placeholder,n)=>{const x=document.createElement('input');x.type='number';x.value=String(n);x.placeholder=placeholder;x.style.cssText='width:75px;background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px';return x;};
const button=t=>{const x=document.createElement('button');x.type='button';x.className='science-action';x.textContent=t;return x};
const kits=choose(),front=input('Forward',24),right=input('Right',0),build=button('ERECT PHYSICAL PLANT OR VESSEL');
const buildStatus=p('Choose a finite industrial kit in your ship cargo, exit on EVA, and position beside the construction site. Placement is limited by ship umbilical and clearance.');
const plants=choose(),reactions=choose(),start=button('START CHEMICAL WORK'),cancel=button('CANCEL JOB (SPENT ENERGY LOST)');
const processStatus=p('Specialized reactions require certified chemical inputs, correctly placed apparatus, separate rated gas tanks and actual ship energy.');
const result=document.createElement('pre');result.style.cssText='white-space:pre-wrap;font:11px/1.5 Consolas,monospace;color:#c8d9d9;background:#101b23;border:1px solid #53677566;padding:12px;max-height:300px;overflow:auto';
for(const [id,spec] of Object.entries(root.StarfallIndustrialChemistry8E.reactions)){const o=document.createElement('option');o.value=id;o.textContent=spec.label;reactions.appendChild(o);}
const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:9px 0';row.append(kits,front,right,build);
const row2=document.createElement('div');row2.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:9px 0';row2.append(plants,reactions,start,cancel);
box.append(label('8E · PHYSICAL REFINERY PLACEMENT'),p('Finite kit → installed terrain machine or rated gas vessel. Existing 8A physical assets are rendered directly on the surface. Erection consumes the full kit and ship battery energy.'),row,buildStatus,
 label('8E · CHEMICAL PLANT CONTROL'),p('Chemistry uses one physical station, certified reagents, dedicated pressure-rated gas storage and timed battery work. This is educational idealized chemistry; do not treat it as real industrial equipment engineering.'),row2,processStatus,result);
host.append(box);
let signature='',last=0;
function refresh(){
 const r=rt();if(!r?.industrialCandidates8E){result.textContent='Flight industrial controllers unavailable';return;}
 const f=+front.value,rr=+right.value;
 const all=r.materials8a.inventory(root.StarfallMining8D.SHIP).filter(l=>root.StarfallIndustrialSite8E.KITS[l.materialId]);
 const sig=all.map(l=>l.id+':'+l.massKg).join('|');
 if(sig!==signature){const old=kits.value;kits.replaceChildren();
  for(const lot of all){const o=document.createElement('option');o.value=lot.id;o.textContent=lot.materialId.replace(/_/g,' ')+' · '+lot.id;kits.appendChild(o);}
  if(all.some(l=>l.id===old))kits.value=old;signature=sig;}
 const available=r.industrialCandidates8E(),oldPlant=plants.value;
 plants.replaceChildren();for(const asset of available){const o=document.createElement('option');o.value=asset.id;o.textContent=asset.id+' · '+asset.station;plants.append(o);}
 if(available.some(a=>a.id===oldPlant))plants.value=oldPlant;
 let siteQuote=null,siteErr='';
 if(kits.value){try{siteQuote=r.industrialConstruction8E(f,rr).find(x=>x.kitLotId===kits.value);siteErr=siteQuote?.reason||'';}
  catch(e){siteErr=String(e.message||e);}}
 const c=r.refineryContext8E(),active=r.industrialJob8e.active;
 let processQuote=null,processErr='';
 if(plants.value){try{processQuote=r.industrialQuote8E(reactions.value,plants.value,100);}
 catch(e){processErr=String(e.message||e);}}
 build.disabled=!siteQuote?.ready||!c.powerEnabled||!c.shipLanded||!c.energyJ||siteQuote.workJ>c.energyJ;
 start.disabled=!!active||!c.operatorNear||!c.powerEnabled||!processQuote;
 cancel.disabled=!active;
 const assets=r.physical8a.list().filter(a=>['industrial_plant','industrial_vessel'].includes(a.type)&&a.location?.bodyId===c.bodyId);
 result.textContent='LOCATION: '+(c.shipLanded?'LANDED · '+c.bodyId:'LAND YOUR SHIP')+
 '\nSHIP BATTERY: '+Math.round(c.energyJ)+' J'+
 '\nPHYSICAL BUILD SITE: '+(siteQuote?.ready?'READY · '+siteQuote.workJ+' J to erect':(siteErr||'NO ONBOARD FACILITY KIT'))+
 '\nBUILT INDUSTRIAL FACILITIES: '+assets.length+
 (assets.length?'\n'+assets.map(a=>'  '+a.id+' '+a.type+' · '+(a.state.station||a.state.materialId)).join('\n'):'')+
 '\nREACTION: '+(processQuote?processQuote.equation+' · '+processQuote.energyJ+' J / '+processQuote.seconds+' s':processErr||'SELECT A STATION')+
 '\nCURRENT JOB: '+(active?active.reactionId+' / '+(100*active.elapsedS/active.seconds).toFixed(1)+'% / '+Math.round(active.energyJ)+' J paid':'NONE')+
 '\nSTOCK: '+r.materials8a.inventory(root.StarfallMining8D.SHIP).length+' ship lots / '+r.physical8a.list().length+' owned assets';
}
function call(action,out){try{const x=action();out.textContent='COMMITTED: '+(x?.id||x?.assetId||'operation');}
 catch(e){out.textContent='BLOCKED: '+String(e.message||e);}refresh();}
build.addEventListener('click',()=>call(()=>rt().industrialInstall8E(kits.value,+front.value,+right.value),buildStatus));
start.addEventListener('click',()=>call(()=>rt().industrialStart8E(reactions.value,plants.value,100),processStatus));
cancel.addEventListener('click',()=>call(()=>rt().industrialCancel8E(),processStatus));
for(const el of [kits,front,right,plants,reactions]){el.addEventListener('change',refresh);}
function frame(){const n=performance.now();if(n-last>1000){last=n;refresh();}requestAnimationFrame(frame);}frame();
root.StarfallIndustrialSiteUI8E={refresh};
})(globalThis);
