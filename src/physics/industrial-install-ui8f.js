/* STARFALL 8F commissioned manufacturing equipment: finite kit + exact owned lot.
 * No station appears before 8A parts, energy, EVA and same-body placement pass.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallIndustrialInstall8F)return;
const section=document.createElement('section');section.className='section';section.id='industrial-install8f';
const heading=document.createElement('div');heading.className='section-title';
heading.textContent='8F · BUILD PHYSICAL MACHINE TOOLS';
const intro=document.createElement('p');intro.className='panel-note';
intro.textContent='EVA only: place industrial machines on the landed world near your spacecraft. No free equipment or stock; installation permanently consumes manufactured parts and ship electrical energy. Advanced chemistry also requires correct feedstocks, reactors and certified pressure tanks.';
const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:10px 0';
const kit=document.createElement('select');kit.setAttribute('aria-label','Select industrial machine kit');
kit.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:9px';
for(const [key,item] of Object.entries(root.StarfallIndustrialInstall8F.KITS)){
 const option=document.createElement('option');option.value=key;option.textContent=item.label;kit.append(option);
}
const front=document.createElement('input');front.type='number';front.value='15';front.min='-100';front.max='100';front.step='5';front.setAttribute('aria-label','Forward distance from explorer');
front.style.cssText='width:78px;background:#101b23;color:#eff;border:1px solid #76808b;padding:8px';
const side=document.createElement('input');side.type='number';side.value='0';side.min='-100';side.max='100';side.step='5';side.setAttribute('aria-label','Rightward distance');
side.style.cssText=front.style.cssText;
const build=document.createElement('button');build.type='button';build.className='science-action';build.textContent='COMMISSION MACHINE FROM OWNED PARTS';
const report=document.createElement('pre');report.style.cssText='white-space:pre-wrap;font:11px/1.55 Consolas,monospace;max-height:280px;overflow:auto;background:#101b23;color:#cedfe4;padding:12px';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
controls.append(kit,front,side,build);section.append(heading,intro,controls,report,status);host.append(section);
let q;
function refresh(){
 const r=root.StarfallRuntime,selected=root.StarfallIndustrialInstall8F.KITS[kit.value];
 if(!r||!selected){report.textContent='Runtime unavailable';return;}
 let error='';
 try{q=r.industrialPreview8F(kit.value,Number(front.value),Number(side.value));}
 catch(e){q=null;error=String(e.message||e);}
 const stocks=r.materials8a.inventory(root.StarfallMining8D.SHIP);
 report.textContent='MACHINE  '+selected.label+
  '\nSITE     '+(q?'SURFACE VALID · '+q.bodyId:'BLOCKED · '+error)+
  '\nPOWER    '+(selected.workJ/1e6).toFixed(2)+' MJ installation energy'+
  '\nPARTS    '+Object.entries(selected.parts).map(([name,kg])=>{
   const n=stocks.filter(l=>l.materialId===name&&l.grade>=.98).reduce((a,l)=>a+l.massKg,0);
   return '\n  '+name+': '+n.toFixed(2)+'/'+kg.toFixed(2)+' kg';
  }).join('')+
  '\nTOOLS    '+selected.tools.join(', ')+
  '\nRULE     Parts must exist in ship hold; machine must be built on safe local terrain';
 build.disabled=!q;
}
build.addEventListener('click',()=>{
 try{const receipt=root.StarfallRuntime.industrialInstall8F(kit.value,Number(front.value),Number(side.value));
  status.textContent='8F · '+receipt.id+' physically installed, '+receipt.massKg.toFixed(2)+' kg conserved.';
 }catch(e){status.textContent='8F · '+String(e.message||e);}
 refresh();
});
kit.addEventListener('change',refresh);front.addEventListener('change',refresh);side.addEventListener('change',refresh);
let last=0;function frame(){const n=performance.now();if(n-last>850){last=n;refresh();}requestAnimationFrame(frame);}frame();
root.StarfallIndustrialInstallUI8F={refresh};
})(globalThis);