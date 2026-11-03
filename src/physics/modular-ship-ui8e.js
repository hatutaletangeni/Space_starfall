/* 8E vessel engineering inspector, backed by T02/T15/8A/8C authorities.
   No fake research results, free crafting, independent electrical inventory,
   or buttons that silently install a ship part. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host)return;
const rt=()=>root.StarfallRuntime;
const open=document.createElement('button');open.type='button';open.className='ui21-link';
open.textContent='Expedition Vessel · Modules';open.title='Inspect real ship modules, cargo and science systems';
const panel=document.createElement('section');panel.hidden=true;panel.id='ship8e-modules';
panel.style.cssText='margin:15px 0;padding:16px;border:1px solid #5d73804e;background:#0f1822;color:#dae5e8;max-width:740px';
const heading=document.createElement('h3');heading.style.cssText='margin:0 0 10px;font-size:17px;letter-spacing:.03em';
heading.textContent='STARFALL EXPEDITION VESSEL / MODULE REGISTRY';
const info=document.createElement('p');info.style.cssText='font:11px/1.65 monospace;color:#abc0c7';
const listing=document.createElement('div');listing.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px';
const links=document.createElement('div');links.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:15px';
const close=document.createElement('button');close.type='button';close.textContent='Close';close.style.cssText='border:1px solid #647781;padding:9px;background:#142431;color:#d4eaef';
close.addEventListener('click',()=>{panel.hidden=true;open.focus();});
const destinations=[['Engineering workbench','workbench-open'],['Field science','field-open'],['Power & systems','systems-toggle'],['Resource storage','physical8a-dialog'],['Planetary research','outpost-open']];
for(const [label,id] of destinations){
 const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.className='science-action';
 btn.style.cssText='font-size:11px;padding:7px 10px';
 btn.addEventListener('click',()=>{
  if(id==='physical8a-dialog')root.StarfallInventoryUI8A?.open?.();
  else document.getElementById(id)?.click();
 });
 links.append(btn);
}
links.append(close);
function refresh(){
 const runtime=rt(),ship=runtime?.modularShip8e,vehicles=runtime?.vehicleStore;
 if(!ship){info.textContent='Module data not yet initialized';return;}
 const asset=vehicles?.get?.('ship'),stats=asset?.stats,expeditionMass=runtime?.shipCargoMass8A?.()||0,
  surveyed=runtime?.resources8c?.observations()?.length||0,stored=runtime?.materials8a?.inventory()?.length||0;
 info.textContent='PHYSICAL CARGO '+expeditionMass.toFixed(0)+' kg  ·  MODELLED STRUCTURE '+ship.mass().toFixed(0)+
  ' kg (NOT applied to flight until propulsion balance)\n'+
  'SHIP ENERGY '+(Number.isFinite(asset?.state?.energyJ)?(asset.state.energyJ/1e6).toFixed(1)+' MJ':'from existing electrical model')+
  '  ·  SOLAR '+(stats?.solarAreaM2??'—')+' m²  ·  '+surveyed+' GEO SURVEYS  ·  '+stored+' MATERIAL LOTS'+
  '\nLIFE SUPPORT: '+(runtime?.lifeSupport8e?.alert||'NOT AVAILABLE')+
  '  ·  O₂ '+(runtime?.lifeSupport8e?.oxygenKg??0).toFixed(1)+' kg'+
  '  ·  WATER '+(runtime?.lifeSupport8e?.waterKg??0).toFixed(1)+' kg'+
  '  ·  SCRUBBER '+(runtime?.lifeSupport8e?.scrubberRemainingKg??0).toFixed(1)+' kg'+
  '  ·  CABIN '+(runtime?.lifeSupport8e?.pressureKPa??0).toFixed(0)+' kPa'+
  '\nWALKABLE DECK: landed → I, then WASD to rooms, X at workstation/bridge. '+ 
  'Upgrades require committed manufactured parts and verified resource consumption; no free installation.';
 listing.replaceChildren();
 for(const m of ship.list(vehicles)){
  const cell=document.createElement('article');cell.style.cssText='border:1px solid #3b5361;padding:11px;background:#14222b';
  const head=document.createElement('strong');head.textContent=m.name;head.style.cssText='font:600 12px/1.4 sans-serif';
  const sub=document.createElement('p');sub.style.cssText='font:10px/1.7 monospace;color:#c0cbd1;margin:5px 0';
  sub.textContent='DECK '+m.deck.toUpperCase()+' · Mk '+m.level+'/'+m.maxLevel+
   '\nSTRUCTURE '+Math.round(m.massKg)+' kg'+
   (m.engineeringComponent?'\nT15 INSTALLED: '+m.engineeringComponent:'')+
   (m.upgradeCost?'\nNEXT MATERIAL INPUT: '+Object.entries(m.upgradeCost).map(([k,v])=>v+' kg '+k.replace(/_/g,' ')).join(', '):'\nMAXIMUM MARK');
  cell.append(head,sub);listing.append(cell);
 }
}
open.addEventListener('click',()=>{panel.hidden=!panel.hidden;if(!panel.hidden)refresh();});
panel.append(heading,info,listing,links);host.append(open,panel);
root.StarfallShip8EUI={open:()=>{panel.hidden=false;refresh();panel.scrollIntoView({block:'nearest'});},refresh};
})(globalThis);
