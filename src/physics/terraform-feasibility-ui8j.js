/* STARFALL 8J — canonical planet-wide atmosphere mass feasibility viewer.
 * Read-only: intentionally refuses to offer fictional instant terraforming.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallTerraform8J?.feasibility||!root.StarfallPhysics?.bodyProfile)return;
const section=document.createElement('section');section.className='section';section.id='terraform-feasibility8j';
const header=document.createElement('div');header.className='section-title';header.textContent='8J · PLANETARY ENGINEERING FEASIBILITY';
const intro=document.createElement('p');intro.className='panel-note';
intro.textContent='Inspect the canonical simulated planet: uniform-atmosphere mass and pressure requirements are enormous. This is a planning instrument only—not a terraform button, a supply generator, or a claim that the world is safe to modify. Atmospheric chemistry, actual import logistics, shielding, climate and planetary protection require further verification.';
const target=document.createElement('input');target.type='number';target.min='0';target.max='10000';target.step='1';target.value='101.325';target.setAttribute('aria-label','Hypothetical target mean surface pressure in kPa');
const rate=document.createElement('input');rate.type='number';rate.min='0';rate.step='1';rate.value='1';rate.setAttribute('aria-label','Hypothetical continuous imported gas rate in kg per second');
for(const e of [target,rate])e.style.cssText='width:min(170px,45%);background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px';
const status=document.createElement('pre');status.style.cssText='white-space:pre-wrap;font:11px/1.55 Consolas,monospace;background:#101b23;color:#c9d9de;border:1px solid #53677566;padding:10px;max-height:270px;overflow:auto';
const row=document.createElement('div');row.style.cssText='display:flex;gap:10px;align-items:center;flex-wrap:wrap';
const label1=document.createElement('label');label1.textContent='Target pressure (kPa) ';label1.append(target);
const label2=document.createElement('label');label2.textContent='Assumed import (kg/s) ';label2.append(rate);
row.append(label1,label2);section.append(header,intro,row,status);host.append(section);
const fmt=(x,d=2)=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:d}):'unknown';
function refresh(){
 try{
  const rt=root.StarfallRuntime,body=rt?.outpostContext?.().body;
  if(!body?.id){status.textContent='Select or approach a real planetary body.';return;}
  const sys=rt.galaxy.byId.get(body.systemId),star=sys?.star||null,
   sp=star?root.StarfallPhysics.starProfile(star):null,
   profile=root.StarfallPhysics.bodyProfile(body,sp);
  const hasLife=!!body.life&&!/^(none|sterile|barren|no life)$/i.test(String(body.life).trim());
  const ruins=root.StarfallRuinsUI?.visibleSites||[];
  const hasRuins=ruins.some(x=>x.bodyId===body.id);
  const a=root.StarfallTerraform8J.feasibility(profile,{
   targetPressurePa:Number(target.value)*1000,
   externalImportKgS:Number(rate.value),
   nativeLife:hasLife,archaeologicalProtection:hasRuins,landable:body.landable});
  status.textContent='WORLD: '+body.name+' · '+body.id+
   '\nCLASSIFICATION: '+profile.classification+' · '+body.type+
   '\nMODEL RADIUS: '+fmt(a.radiusM/1000,1)+' km · SURFACE g: '+fmt(a.gravityMS2,3)+' m/s²'+
   '\nESCAPE VELOCITY: '+fmt(a.escapeSpeedMS/1000,2)+' km/s'+
   '\nSEEDED BASELINE: '+fmt(a.baselinePressurePa/1000,3)+' kPa'+
   '\nTARGET: '+fmt(a.targetPressurePa/1000,3)+' kPa'+
   '\n1 Pa MEAN PRESSURE REQUIRES: '+fmt(a.massPerPa,0)+' kg of atmosphere'+
   '\nNET IMPORT FOR TARGET: '+fmt(a.requiredImportKg,0)+' kg'+
   '\nOR REMOVAL FOR LOWER TARGET: '+fmt(a.captureKg,0)+' kg'+
   '\nASSUMED CONTINUOUS IMPORT: '+fmt(a.hypotheticalRateKgS,2)+' kg/s'+
   '\nIDEALIZED YEARS AT RATE: '+(a.yearsAtRate===null?'NO IMPORT RATE':fmt(a.yearsAtRate,1))+
   '\nPLANETARY PROTECTION: '+(a.protectedWorld?'WARNING / PRESERVE NATIVE SITES':'NO IDENTIFIED NATIVE SITES; NOT CLEARED')+
   '\nREAL INDUSTRIAL ACTION: LOCKED / NOT IMPLEMENTED'+
   '\n\n'+a.warnings.join('\n');
 }catch(e){status.textContent='INSUFFICIENT CANONICAL WORLD DATA: '+String(e.message||e);}
}
for(const i of [target,rate])i.addEventListener('input',refresh);
let last=0;function loop(t){if(t-last>2000){last=t;refresh();}root.requestAnimationFrame(loop);}root.requestAnimationFrame(loop);
root.StarfallTerraformFeasibilityUI8J={refresh};
})(globalThis);
