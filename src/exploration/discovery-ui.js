/* STARFALL 6D — optional field notebook and evidence chain; no flight-loop mutation. */
(function(root){'use strict';
const D=root.StarfallDiscovery,A=root.StarfallArchaeology,T=root.StarfallStableTerrain,RT=root.StarfallRuntime,R=root.StarfallRuinsUI,S=root.StarfallScienceUI,Out=root.StarfallOutpostUI;
if(!D||!A||!T||!RT||!R||!S)throw Error('Expedition dependencies unavailable');
const $=id=>document.getElementById(id),key='expedition6d';const old=SF.load()?.[key];let records=D.validateRecords(old?.records),candidates=[],selectedId=null,bodyId=null,lastDir=null,lastRefresh=0;
const num=n=>Number.isFinite(n)?n.toFixed(1):'—';
const stage=['UNSURVEYED','SIGNAL MAPPED','FIELD VISITED','INSTRUMENTS LINKED','LABORATORY ARCHIVED'];
function context(){const c=RT.outpostContext();if(!c?.body?.landable)return null;let local=c.local;if(!c.landed){const V=root.Starfall3D.V,world=V.sub(c.position,c.body.position);if(V.len(world)>c.body.radius+5000)return null;local=V.rot(A.norm(world),c.body.spinAxis||[0,1,0],-(c.body.spinAngle||0));}return Array.isArray(local)?{...c,local:A.norm(local)}:null;}
function observations(){return S.journal;}function receipts(){return Out?.store?.receipts||[];}
function nearby(force=false){const c=context();if(!c){candidates=[];bodyId=null;return null;}
 if(!force&&c.body.id===bodyId&&lastDir&&A.arc(c.local,lastDir,c.body.radius)<25)return c;
 const ruins=A.nearby(c.body,c.local,(body,dir)=>root.Starfall3D.sampleTerrain(body,dir),4);
 candidates=D.candidates(c.body,c.local,(body,dir)=>root.Starfall3D.sampleTerrain(body,dir),ruins,3,RT.galaxy.seed).slice(0,100);
 bodyId=c.body.id;lastDir=[...c.local];lastRefresh=performance.now();return c;}
function record(id){const c=candidates.find(x=>x.id===id);return records.find(x=>x.id===id&&x.bodyId===(c?.bodyId||x.bodyId))||null;}
function selected(){return candidates.find(c=>c.id===selectedId)||null;}
function distance(site,c){return A.arc(site.local,c.local,c.body.radius);}
function save(){SF.save({[key]:{schema:1,records:records.slice(-400)}});}
function setStatus(t,err=false){$('discovery-status').textContent=t;$('discovery-status').style.color=err?'#ff9e8f':'#eac18e';}
function persistRecord(r){const i=records.findIndex(x=>x.id===r.id&&x.bodyId===r.bodyId);if(i<0)records.push(r);else records[i]=r;while(records.length>400)records.shift();save();}
function signal(site,rec){return rec?.stage>=2?(site.category==='archaeological'?'STRUCTURAL REMAINS':'GEOLOGICAL · '+(D.MODELS[site.kind]?.name||'Unclassified')):rec?.stage===1?'Mapped '+site.category+' signal':'Unmapped '+site.category+' signal';}
function renderList(){const ctx=nearby(true),box=$('discovery-candidates');box.replaceChildren();$('discovery-world').textContent=ctx?.body?.name||'No landable world nearby';
 if(!ctx){box.textContent='Approach a solid world to begin a local expedition.';renderDetails();return;}
 for(const site of candidates){const r=record(site.id),button=document.createElement('button');button.type='button';button.className='discovery-entry';button.dataset.discoveryId=site.id;button.setAttribute('aria-pressed',String(selectedId===site.id));button.textContent=signal(site,r)+' · '+num(distance(site,ctx))+' units · '+(site.biome||'unknown');button.onclick=()=>{selectedId=site.id;renderDetails();for(const el of box.children)el.setAttribute('aria-pressed',String(el===button));};box.append(button);}
 if(!candidates.some(x=>x.id===selectedId))selectedId=candidates[0]?.id||null;
 $('discovery-summary').textContent=candidates.length+' local signals · '+records.length+' archived records · survey radius is local only';if(!candidates.length)box.textContent='No anomalies in this area. Travel to a new region or world.';
 renderDetails();}
function renderDetails(){const site=selected(),ctx=context(),box=$('discovery-details');if(!site||!ctx){box.textContent='Select a nearby signal to inspect its evidence chain.';$('discovery-notes').value='';return;}
 const rec=record(site.id),measure=observations(),report=D.hypotheses(site,rec,measure,receipts()),range=distance(site,ctx),p=rec?.stage||0,requirement=site.category==='geological'?D.MODELS[site.kind]?.instrument:'magnetometer / spectrometer / sampler';
 let lines=['SIGNAL '+site.id,'Planet '+ctx.body.name+' · '+num(range)+' scene units', 'Region '+site.biome, 'Evidence stage '+p+' / 4 — '+stage[p], 'Survey classification: '+report.confidence.label+' ('+Math.round(report.confidence.value*100)+'% modeled evidence score)', 'Measurements linked: '+report.measurements+' · independent instrument types: '+report.distinctInstruments,'Laboratory receipt(s): '+report.labReceipts,'Recommended instrument: '+(p>=1?requirement:'unclassified (map signal first)')];
 if(!p)lines.push('Candidate classification is deliberately withheld until a close field visit.');
 else if(p===1)lines.push('Mapped only: the remote signal is not a confirmed material or archaeological discovery.');
 else{lines.push('Field interpretation: '+report.interpretation);if(site.category==='archaeological')lines.push('Use ANCIENT RUINS to examine architecture and collect historical hypotheses.');}
 if(site.category==='archaeological'){const artifacts=(root.StarfallInteriorsUI?.records||[]).filter(a=>a.siteId===site.id&&a.bodyId===site.bodyId);if(artifacts.length)lines.push('IN-SITU INTERIOR STUDIES: '+artifacts.length+' distinct artifact(s) examined: '+artifacts.map(a=>a.label).join(', ')+'. These are separate visual evidence, not laboratory-confirmed instrument observations.');}
 lines.push('Model: '+site.model,report.limitation);
 box.textContent=lines.join('\n');$('discovery-notes').value=rec?.notes||'';
 $('discovery-action-survey').disabled=p>=1;$('discovery-action-field').disabled=p<1||p>=2;$('discovery-action-evidence').disabled=p<2;$('discovery-action-lab').disabled=p<3;
}
function action(op){try{const ctx=nearby(),site=selected();if(!ctx||!site)throw Error('Select a candidate on a solid world');const next=D.transition(record(site.id),site,op,{distance:distance(site,ctx),landed:ctx.landed,eva:ctx.eva,timeS:Math.max(0,RT.time),observations:observations(),receipts:receipts(),bodyRadius:ctx.body.radius});persistRecord(next);setStatus(op==='lab'?'Laboratory record linked.':'Expedition updated. Stage '+next.stage+' / 4');renderList();}catch(e){setStatus(e.message,true);}}
function writeNote(){const site=selected(),rec=site&&record(site.id);if(!rec){setStatus('Map the signal before adding field notes.',true);return;}rec.notes=$('discovery-notes').value.slice(0,500);save();setStatus('Field note saved locally.');}
function renderComparison(){const items=D.compare(records,observations(),receipts()),box=$('discovery-comparison');box.replaceChildren();
 if(!items.length){box.textContent='No mapped signals yet. Begin a local survey.';return;}
 const table=document.createElement('table');table.className='discovery-table';table.innerHTML='<thead><tr><th>World</th><th>Sites</th><th>Field</th><th>Evidence</th><th>Lab</th><th>Instruments</th></tr></thead>';const tbody=document.createElement('tbody');for(const w of items){const row=document.createElement('tr');for(const value of [w.bodyId,w.sites,w.examined,w.corroborated,w.laboratory,w.instruments]){const td=document.createElement('td');td.textContent=String(value);row.append(td);}tbody.append(row);}table.append(tbody);box.append(table);
 const summaries=items.map(x=>x.bodyId+': '+x.geological+' geological, '+x.archaeological+' archaeological, '+x.observations+' measurements; '+x.laboratory+' lab-archived').join('\n');const small=document.createElement('pre');small.textContent=summaries;box.append(small);}
function exportFile(kind){const data={schema:1,seed:RT.galaxy.seed,createdSimTime:RT.time,model:'evidence-based fictional sandbox expedition',records,linkedObservations:observations().filter(o=>records.some(r=>r.evidenceIds.includes(o.id))),labReceipts:receipts().filter(r=>records.some(x=>x.evidenceIds.includes(r.observationId))),worldComparison:D.compare(records,observations(),receipts()),interiorArtifactRecords:root.StarfallInteriorsUI?.records||[],notes:'Confidence is a gameplay evidence score; it is not a calibrated scientific probability. Raw observations remain in the Field Science journal.'};const text=kind==='csv'?D.csv(records):JSON.stringify(data,null,2),url=URL.createObjectURL(new Blob([text],{type:kind==='csv'?'text/csv':'application/json'})),a=document.createElement('a');a.href=url;a.download='starfall-expeditions.'+kind;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Expedition archive exported as '+kind.toUpperCase());}
$('discovery-open').onclick=()=>{$('discovery-panel').hidden=false;renderList();};$('discovery-close').onclick=()=>{$('discovery-panel').hidden=true;};$('discovery-panel').addEventListener('click',e=>{if(e.target===$('discovery-panel'))$('discovery-panel').hidden=true;});
$('discovery-rescan').onclick=()=>{lastDir=null;renderList();};for(const op of ['survey','field','evidence','lab'])$('discovery-action-'+op).onclick=()=>action(op);
$('discovery-save-note').onclick=writeNote;$('discovery-export-json').onclick=()=>exportFile('json');$('discovery-export-csv').onclick=()=>exportFile('csv');$('discovery-view-compare').onclick=()=>{const hidden=$('discovery-comparison').hidden;$('discovery-comparison').hidden=!hidden;if(hidden)renderComparison();};
$('discovery-field-tools').onclick=()=>{$('discovery-panel').hidden=true;$('field-open').click();};$('discovery-ruins-tools').onclick=()=>{$('discovery-panel').hidden=true;$('ruin-open').click();};$('discovery-lab-tools').onclick=()=>{$('discovery-panel').hidden=true;$('outpost-open').click();};
$('discovery-panel').addEventListener('keydown',e=>{if(e.key==='Escape'){$('discovery-panel').hidden=true;e.stopPropagation();}});
addEventListener('pagehide',save);
root.StarfallExpeditionUI={refresh:renderList,select:id=>{selectedId=id;renderDetails();},action, get records(){return records.map(x=>({...x,evidenceIds:[...x.evidenceIds],labReceiptIds:[...x.labReceiptIds]}));},get candidates(){nearby();return candidates.slice();}};
})(globalThis);
