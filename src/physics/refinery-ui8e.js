/* STARFALL 8E — compact in-game processing console under Engineer.
   The only operations are actual flight-owned ship workshop jobs. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');if(!host)return;
const rt=()=>root.StarfallRuntime, api=root.StarfallRefinery8E;
const panel=document.createElement('section');panel.className='section';panel.id='refinery8e-panel';
const title=document.createElement('div');title.className='section-title';title.textContent='REFINERY · SHIP FABRICATION';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='Finite 8D ores can now be concentrated and identified: iron → modeled hematite, copper sulfide → Cu₂S, aluminum ore → hydrated aluminosilicate, carbon-bearing rock → carbon, silica → 99% SiO₂. Every process pays real ship battery energy, produces tailings and retains original inventory mass. Update 8H also recovers only a measured FRACTION of actual previous iron/copper tailings in a second powered sorter pass; spent material remains in the original 8A hold. Original production receipt is mandatory; no free or infinitely recyclable stock. Furnace chemistry requires separately installed equipment and captured exhaust.';
const select=document.createElement('select');select.setAttribute('aria-label','Select actual material processing operation');
select.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:9px;width:100%';
for(const [k,r] of Object.entries(api.MODES)){const opt=document.createElement('option');opt.value=k;opt.textContent=r.label+' · '+r.massKg+' kg';select.appendChild(opt);}
const start=document.createElement('button');start.type='button';start.textContent='START PROCESSING';start.className='science-action';
const cancel=document.createElement('button');cancel.type='button';cancel.textContent='CANCEL (USED ENERGY NOT REFUNDED)';cancel.className='science-action';
const controls=document.createElement('div');controls.style.cssText='display:flex;gap:9px;flex-wrap:wrap;margin:10px 0';controls.append(start,cancel);
const readout=document.createElement('pre');readout.style.cssText='white-space:pre-wrap;font:11px/1.55 Consolas,monospace;max-height:300px;overflow:auto;color:#c8d9d9;background:#101b23;border:1px solid #53677566;padding:12px';
function refresh(){
 const r=rt();if(!r?.refinery8e){readout.textContent='Live 8E refinery runtime unavailable.';return;}
 const ctx=r.refineryContext8E(),job=ctx.active,stock=r.materials8a.inventory(root.StarfallMining8D.SHIP);
 const measured=stock.reduce((a,l)=>a+l.massKg,0),output=stock.filter(l=>l.provenance?.startsWith('process:'));
 let quote=null,why='';
 try{quote=r.refineryQuote8E(select.value);}catch(e){why=String(e.message||e);}
 readout.textContent='SHIP WORKSHOP   '+(ctx.workshopInstalled?'INSTALLED':'NOT INSTALLED')+
  '\nWORKSITE        '+(ctx.shipLanded?'LANDED · '+ctx.bodyId:'SHIP NOT LANDED')+
  '\nOPERATOR       '+(ctx.operatorNear?'AT SHIP SERVICE TERMINAL':'APPROACH FABRICATION ROOM OR LANDED SHIP')+
  '\nSHIP POWER     '+(ctx.powerEnabled?'ENABLED':'OFF')+' · '+(ctx.energyJ/1e6).toFixed(3)+' MJ AVAILABLE'+
  '\nSHIP MATERIALS '+measured.toFixed(2)+' kg · '+stock.length+' lot(s)'+
  '\nPRODUCT LOTS   '+output.length+
  '\nPROCESS        '+(job?job.mode+' '+(100*job.elapsedS/job.seconds).toFixed(1)+'% · '+job.energyJ.toFixed(0)+' J paid':'IDLE')+
  '\nEXPECTED       '+(quote?quote.inputKg+' kg '+quote.material+' → '+quote.productKg.toFixed(2)+' kg '+quote.product+
    ' + '+quote.residueKg.toFixed(2)+' kg residues; '+Math.round(quote.energyJ/1000)+' kJ / '+quote.seconds+' s':why)+
  '\nRECENT RECEIPTS '+r.refinery8e.receipts.slice(-4).map(x=>'\n  '+x.id+' '+x.status+' '+x.mode).join('');
 start.disabled=!!job||!ctx.operatorNear||!ctx.shipLanded||!ctx.powerEnabled||!quote||ctx.energyJ<=0;
 cancel.disabled=!job;
}
function doAction(action){try{const value=action();status.textContent='8E · '+(value?.id||'PROCESS')+' accepted; all output is held in physical ship material storage.';}catch(e){status.textContent='8E · '+String(e?.message||e);}refresh();}
start.addEventListener('click',()=>doAction(()=>rt().refineryStart8E(select.value)));
cancel.addEventListener('click',()=>doAction(()=>rt().refineryCancel8E()));
select.addEventListener('change',refresh);
panel.append(title,status,select,controls,readout);host.appendChild(panel);
let last=0;const tick=()=>{const now=performance.now();if(now-last>=750){last=now;refresh();}requestAnimationFrame(tick);};tick();
root.StarfallRefineryUI8E={refresh};
})(globalThis);
