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
const plants=choose(),reactions=choose(),batchSize=choose(),start=button('START CHEMICAL WORK'),cancel=button('CANCEL JOB (SPENT ENERGY LOST)');
for(const scale of [0.05,0.1,0.25,1,5,10,25,50,100]){const o=document.createElement('option');o.value=String(scale);o.textContent=scale+' mol feed basis';batchSize.appendChild(o);}
const processStatus=p('Specialized reactions now require certified chemical inputs and ORIGINAL physically paid gas manifolds: each gas stream needs its own installed 320 kg / 8 MPa pipeline within 12 scene units of the real station and matching pressure-rated vessel, with an installed, WIRED, currently served original 420 W native T02 pump load. The original ship battery pays the chemical reaction, which now makes each product gas lot INSIDE its actual empty 80 L pipe. The original 420 W native T02 grid then separately pumps this RESERVED 8A gas lot into its rated output vessel over simulated time; disconnects/blackouts pause the gas in the pipe. Gas INPUT now physically reserves existing rated-vessel stock, loads the manufactured 80 L inlet pipe after source-paid native T02 power, then pays a second real pump interval to make the reactor feed ready. Both reactants and products remain original 8A tracked matter; cancelled pipe-loaded gas is NOT magically refunded. A legacy active reaction without staged inlet IDs must be cancelled/restarted rather than bypass its pipe.');
const result=document.createElement('pre');result.style.cssText='white-space:pre-wrap;font:11px/1.5 Consolas,monospace;color:#c8d9d9;background:#101b23;border:1px solid #53677566;padding:12px;max-height:300px;overflow:auto';
for(const [id,spec] of Object.entries(root.StarfallIndustrialChemistry8E.reactions)){const o=document.createElement('option');o.value=id;o.textContent=spec.label;reactions.appendChild(o);}
const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:9px 0';row.append(kits,front,right,build);
const row2=document.createElement('div');row2.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:9px 0';row2.append(plants,reactions,batchSize,start,cancel);
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
 const chemicalGas=r.chemicalGasOutput8h?.jobs||[];
 const gasOwned=chemicalGas.filter(j=>j.bodyId===c.bodyId).slice(-8);
 const reagentGas=r.chemicalGasInput8h?.jobs||[];
 const realInlet=reagentGas.filter(j=>j.bodyId===c.bodyId).slice(-8);
 let processQuote=null,processErr='';
 if(plants.value){try{processQuote=r.industrialQuote8E(reactions.value,plants.value,Number(batchSize.value));}
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
 '\nACTUAL 8A PRODUCT GAS TRANSIT (80 L physical line → rated receiver): '+(gasOwned.length?gasOwned.length+' real chemical source-owned shipments':'NO PENDING GAS')+
 (gasOwned.length?'\n'+gasOwned.map(j=>
   '  '+j.materialId+' · '+j.massKg.toFixed(3)+' kg · '+j.status+
   ' · '+Math.ceil(j.remainingS)+'s pump left · original T02 '+Math.round(j.paidJ)+' J'+
   ' · '+j.pipeId+' → '+j.vesselId).join('\n'):'')+
 '\nINBOUND ORIGINAL 8A GAS (certified vessel → real 80 L pipe → paid reactor inlet): '+
  (realInlet.length?realInlet.length+' source-owned jobs':'NONE')+
 (realInlet.length?'\n'+realInlet.map(j=>
   '  '+j.materialId+' · '+j.massKg.toFixed(3)+' kg · '+j.status+
   ' · T02 stage '+j.stage+'/2 · '+Math.ceil(j.remainingS)+'s left · original '+Math.round(j.paidJ)+' J'+
   ' · '+j.vesselId+' → '+j.pipeId+' → '+j.stationId).join('\n'):'')+
 (active&&active.gasInputRequired8H!==true&&Object.keys(active.gasManifolds||{}).some(x=>x.startsWith('input:'))?
  '\nLEGACY INLET: PAUSED, CANCEL AND RESTART WITH REAL SOURCE-OWNED PIPE':'')+
 '\nREACTOR MAY USE GAS ONLY WHEN ALL ORIGINAL PHYSICAL INLET JOBS ARE READY'+
 '\nSTOCK: '+r.materials8a.inventory(root.StarfallMining8D.SHIP).length+' ship lots / '+r.physical8a.list().length+' owned assets';
}
function call(action,out){try{const x=action();out.textContent='COMMITTED: '+(x?.id||x?.assetId||'operation');}
 catch(e){out.textContent='BLOCKED: '+String(e.message||e);}refresh();}
build.addEventListener('click',()=>call(()=>rt().industrialInstall8E(kits.value,+front.value,+right.value),buildStatus));
start.addEventListener('click',()=>call(()=>rt().industrialStart8E(reactions.value,plants.value,Number(batchSize.value)),processStatus));
cancel.addEventListener('click',()=>call(()=>rt().industrialCancel8E(),processStatus));
for(const el of [kits,front,right,plants,reactions,batchSize]){el.addEventListener('change',refresh);}
function frame(){const n=performance.now();if(n-last>1000){last=n;refresh();}requestAnimationFrame(frame);}frame();
root.StarfallIndustrialSiteUI8E={refresh};
})(globalThis);
