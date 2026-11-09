/* 8I/8J Engineer inspector: calls only source-owned StarfallRuntime actions.
 * Nothing grants material; no second stock, planet, ECLSS or power ledger.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallManufacturedECLSS8I||!root.StarfallTerraformOperations8J)return;
const section=document.createElement('section');section.className='section';
section.setAttribute('aria-label','Industrial habitat and world environmental operations');
section.innerHTML=`<h3>Local environment · 8I / 8J</h3>
<p class="panel-note">Operate a genuinely manufactured and physically charged habitat. Electrical service uses the real landed ship battery and requires EVA at the actual shell. A small CO₂ release requires existing gas in an original rated vessel; it never instantly terraforms a planet.</p>
<div class="obs-tools"><label>Manufactured habitat <select id="hab-8i-select"></select></label>
<button type="button" class="science-action" id="hab-8i-commission">COMMISSION FINITE ECLSS</button>
<button type="button" class="science-action" id="hab-8i-run">RUN / MEASURE CURRENT SIM TIME</button></div>
<pre id="hab-8i-status" class="launch-output" role="status" aria-live="polite">Land and inspect an actual 8G habitat.</pre>
<div class="obs-tools"><label>Rated CO₂ vessel <select id="terra-8j-vessel"></select></label>
<label>Source gas lot <select id="terra-8j-lot"></select></label>
<label>Pulse (kg) <input id="terra-8j-mass" type="number" min="0.001" max="0.5" step="0.01" value="0.1"/></label>
<button type="button" class="science-action" id="terra-8j-vent">METER / VENT REAL CO₂</button>
<button type="button" class="science-action" id="terra-8j-measure">REFRESH WORLD SENSORS</button></div>
<pre id="terra-8j-status" class="launch-output" role="status" aria-live="polite">Atmospheric feasibility and real gas custody appear here.</pre>
<p class="panel-note">Model limits: zero-crew air circulation and CO₂ capture capacity only; wastewater, greenhouse ecology, autonomous remote grid power and real-world climate prediction remain unqualified. Initial sub-kilogram atmospheric changes are normally below instrument resolution.</p>`;
host.append(section);
const $=id=>document.getElementById(id),sel=$('hab-8i-select'),vessel=$('terra-8j-vessel'),lot=$('terra-8j-lot');
const fmt=(n,d=3)=>Number.isFinite(n)?Number(n).toFixed(d):'N/A';
let cached=[];
function options(control,rows,placeholder){
 const former=control.value;
 control.replaceChildren();
 if(!rows.length){const opt=document.createElement('option');opt.value='';opt.textContent=placeholder;control.append(opt);return;}
 for(const r of rows){const o=document.createElement('option');o.value=r.id;o.textContent=r.label;control.append(o);}
 if(rows.some(r=>r.id===former))control.value=former;
}
function paintLots(){
 const row=cached.find(x=>x.id===vessel.value);
 options(lot,(row?.lots||[]).map(x=>({id:x.id,label:x.id+' · '+fmt(x.massKg)+' kg · '+x.provenance})),
  'No certified CO₂ lots in this vessel');
}
function refresh(){
 const rt=root.StarfallRuntime;if(!rt)return;
 try{
  const h=rt.manufacturedHabitatContext8I();
  options(sel,h.habitats.map(x=>({id:x.id,label:x.id+(x.commissioned?' · ECLSS':' · awaiting certification')})),
   'No charged manufactured habitat on this world');
  const selected=h.habitats.find(x=>x.id===sel.value);
  $('hab-8i-status').textContent=selected?
   selected.error||('Habitat '+selected.id+' · '+(selected.commissioned?'COMMISSIONED':'NOT COMMISSIONED')+
   '\nPressure '+fmt(selected.pressureKPa)+' kPa / O₂ '+fmt(selected.oxygenKPa)+
   ' kPa / CO₂ '+fmt(selected.carbonKPa)+' kPa / T '+fmt(selected.temperatureK,1)+
   ' K\nWater '+fmt(selected.waterKg)+' kg · vented '+fmt(selected.ventedKg,6)+
   ' kg · source energy '+fmt(selected.energyConsumedJ,0)+' J'+
   '\nFilter remaining '+fmt(selected.scrubberRemainingMol)+' mol / airlock '+selected.airlock+
   '\n'+(selected.alarms||[]).join('; ')):'No manufactured 8G habitat exists here.';
  const t=rt.terraformContext8J();cached=t.vessels||[];
  options(vessel,cached.map(v=>({id:v.id,label:v.id+' · '+v.lots.reduce((a,l)=>a+l.massKg,0).toFixed(3)+' kg CO₂'})),
   'No original 8A CO₂ vessel on this world');paintLots();
  const o=t.observation;
  $('terra-8j-status').textContent=t.error||(!o?'No atmospheric model':'World '+o.bodyId+
   '\nModeled current pressure '+fmt(o.pressurePa,5)+' Pa · baseline '+fmt(o.baselinePressurePa,5)+' Pa'+
   '\nModeled perturbation '+(o.modeledDeltaPa||0).toExponential(6)+' Pa; uncertainty ±'+
   fmt(o.pressureUncertaintyPa,2)+' Pa · '+(o.pressureChangeResolved?'potentially resolvable':'BELOW RESOLUTION')+
   '\nRetained CO₂ '+fmt(o.injectedCO2Kg,6)+' kg · escaped '+fmt(o.escapedCO2Kg,6)+
   ' kg · events '+o.eventCount+' · ΔT '+fmt(o.modeledDeltaTemperatureK,6)+' K'+
   '\nThis is a seeded modeled estimate, not measured climate or visible global terraforming.');
 }catch(e){$('terra-8j-status').textContent='8I/8J status unavailable: '+e.message;}
}
function action(run,id){
 try{const result=run();refresh();
  $(id).textContent='COMPLETE: '+JSON.stringify(result).slice(0,560);}
 catch(e){$(id).textContent='BLOCKED: '+String(e.message||e);} }
$('hab-8i-commission').addEventListener('click',e=>{e.stopPropagation();action(()=>
 root.StarfallRuntime.manufacturedHabitatCommission8I(sel.value),'hab-8i-status');});
$('hab-8i-run').addEventListener('click',e=>{e.stopPropagation();action(()=>
 root.StarfallRuntime.manufacturedHabitatRun8I(sel.value),'hab-8i-status');});
$('terra-8j-vent').addEventListener('click',e=>{e.stopPropagation();action(()=>
 root.StarfallRuntime.terraformRelease8J(vessel.value,lot.value,Number($('terra-8j-mass').value)),
 'terra-8j-status');});
$('terra-8j-measure').addEventListener('click',refresh);
vessel.addEventListener('change',paintLots);sel.addEventListener('change',refresh);
document.addEventListener('click',e=>{if(e.target?.closest?.('#sf-mission-flow,.ui21-page[data-page="Engineer"],#sf-mission-button'))refresh();});
refresh();
root.StarfallEnvironmentUI8IJ=Object.freeze({refresh});
})(window);
