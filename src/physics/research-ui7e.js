/* STARFALL 7E — optional, accessible engineering trial workbench. Offline only. */
(function(root){'use strict';
const $=id=>document.getElementById(id),R=root.StarfallResearch7E,RT=root.StarfallRuntime;
if(!R||!RT||!$('research7e'))return;
const store=new R.Store(root.SF.load().research7e),fmt=(n,d=2)=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):String(n??'—');
const status=(msg,ok=false)=>{const el=$('research7e-status');el.textContent=msg;el.dataset.success=ok?'true':'false';};
const save=()=>root.SF.save({research7e:store.serialize()});
const make=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n;};
function row(box,label,value){const p=make('div',undefined,'research7e-row');p.append(make('span',label),make('strong',typeof value==='number'?fmt(value):String(value??'—')));box.append(p);}
function renderInputs(){
 const type=$('research7e-type').value;
 $('research7e-rover').hidden=type!=='rover';$('research7e-power').hidden=type!=='power';$('research7e-rocket').hidden=type!=='rocket';
 $('research7e-vehicle').disabled=type==='rocket';if(type==='rover')$('research7e-vehicle').value='rover';
}
function inputNum(id){return Number($(id).value);}
function options(){
 const type=$('research7e-type').value,kind=$('research7e-vehicle').value;
 const definition=type==='rocket'?null:RT.vehicleStore.get(kind).definition;
 const conditions={durationS:inputNum('research7e-duration')};
 if(type==='rover'){Object.assign(conditions,{slopeDeg:inputNum('research7e-slope'),gearRatio:inputNum('research7e-gear'),wheelScale:inputNum('research7e-wheel'),gravityMS2:inputNum('research7e-gravity')});}
 if(type==='power'){Object.assign(conditions,{daylight:inputNum('research7e-daylight'),chargeFraction:inputNum('research7e-charge'),driveFraction:inputNum('research7e-drive'),lights:$('research7e-lights').checked});}
 if(type==='rocket'){Object.assign(conditions,{gravityMS2:inputNum('research7e-rocket-gravity'),rho0:inputNum('research7e-rho'),targetAltitudeM:inputNum('research7e-altitude')});}
 const rocket=type==='rocket'?{engine:$('research7e-engine').value,payload:'relay',stages:inputNum('research7e-stages'),tanks:inputNum('research7e-tanks'),boosters:inputNum('research7e-boosters')}:undefined;
 const observations=(root.StarfallScienceUI?.journal||[]).slice(-12).map(x=>x.id).filter(x=>typeof x==='string');
 return {type,title:$('research7e-name').value||type+' bench test',definition,rocket,conditions,
  world:{bodyId:RT.nearest?.id||'bench-body',systemId:RT.nearest?.systemId||'bench-system'},
  sourceAssetId:definition?.id||'rocket-bench',observations,
  notes:'Controlled engineering model run. Not an instrument reading from physical hardware.'};
}
function metricBox(box,obj){box.replaceChildren();Object.entries(obj||{}).forEach(([k,v])=>row(box,k,Array.isArray(v)?v.join(', '):v));}
function populateSelect(id,records,label,selected){const node=$(id);node.replaceChildren();for(const r of records){const o=make('option');o.value=r.id;o.textContent=label(r);node.append(o);}if(selected&&records.some(x=>x.id===selected))node.value=selected;}
function render(){
 const runs=store.runs.slice().reverse(),bps=store.blueprints.slice().reverse(),recent=runs.slice(0,14);
 const table=$('research7e-history');table.replaceChildren();
 for(const r of recent){const line=make('button',undefined,'research7e-history-item');line.type='button';
  line.append(make('span',r.title+' · '+r.id),make('span',r.success?'COMPLETED':'FAILED / INCOMPLETE'));
  line.title=r.reason;line.onclick=()=>showRun(r);table.append(line);}
 populateSelect('research7e-compare-a',runs,r=>r.title+' / '+r.id);populateSelect('research7e-compare-b',runs,r=>r.title+' / '+r.id);
 populateSelect('research7e-blueprint',bps,r=>r.title+(r.benchOnly?' [bench-only]':'')+(r.imported?' [imported]':''));
 $('research7e-save-bp').disabled=!runs.length||!runs[0].success;
 $('research7e-apply-bp').disabled=!bps.length;
 if(!runs.length)$('research7e-results').textContent='Run a controlled test to see the prediction and the simulated outcome.';
 if(!bps.length)$('research7e-bp-note').textContent='No validated blueprint recorded yet.';
}
function showRun(r){
 const results=$('research7e-results');results.replaceChildren();
 results.append(make('h3',r.title+' · '+r.id));
 results.append(make('p','Model: '+r.model));
 const cols=make('div',undefined,'research7e-columns');
 const p=make('div',undefined,'research7e-result'),s=make('div',undefined,'research7e-result');
 p.append(make('h4','PREDICTED'));s.append(make('h4','SIMULATED IN GAME MODEL'));
 const a=make('div'),b=make('div');metricBox(a,r.predicted);metricBox(b,r.simulated);
 p.append(a);s.append(b);cols.append(p,s);results.append(cols,make('p',(r.success?'PASS · ':'INCOMPLETE · ')+r.reason));
}
$('research7e-open').onclick=()=>{renderInputs();render();$('research7e').hidden=false;$('workbench').hidden=true;$('research7e-type').focus();};
function close(){$('research7e').hidden=true;}
$('research7e-close').onclick=close;$('research7e').addEventListener('click',e=>{if(e.target===$('research7e'))close();});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('research7e').hidden){close();e.stopImmediatePropagation();}},true);
$('research7e-type').onchange=renderInputs;
$('research7e-run').onclick=()=>{try{
 const p=store.plan(options());const r=store.run(p.id,RT.time);save();render();showRun(r);
 status('Trial '+r.id+' recorded. Simulation is a bounded engineering model, not a physical-world measurement.',true);
 }catch(e){status(e.message);}};
$('research7e-save-bp').onclick=()=>{try{
 const runs=store.runs;if(!runs.length)throw Error('Run an experiment first');
 const b=store.blueprint(runs[runs.length-1].id,$('research7e-name').value);
 save();render();$('research7e-blueprint').value=b.id;status('Validated test blueprint '+b.id+' saved.',true);
 }catch(e){status(e.message);}};
$('research7e-compare').onclick=()=>{try{
 const rows=store.compare($('research7e-compare-a').value,$('research7e-compare-b').value);
 const box=$('research7e-comparison');box.replaceChildren();for(const v of rows)row(box,v.metric,fmt(v.first)+' → '+fmt(v.second)+' (Δ '+fmt(v.difference)+')');
 if(!rows.length)box.textContent='No comparable numeric metrics';
 status('Comparing runs under their recorded conditions. Compare controlled conditions for meaningful results.',true);
 }catch(e){status(e.message);}};
function download(name,data){const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=make('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('research7e-export').onclick=()=>{try{const id=$('research7e-blueprint').value;download('starfall-blueprint-7e.json',store.exportBlueprint(id));status('Blueprint exported.',true);}catch(e){status(e.message);}};
$('research7e-import').onclick=()=>{try{const b=store.importBlueprint($('research7e-import-json').value);save();render();$('research7e-blueprint').value=b.id;status('Blueprint imported. Imported model evidence is not independently verified here; test locally before applying.',true);}catch(e){status(e.message);}};
$('research7e-apply-bp').onclick=()=>{try{const b=store.blueprints.find(x=>x.id===$('research7e-blueprint').value);
 if(!b)throw Error('Select a blueprint');
 if(b.imported)throw Error('Imported blueprints require local revalidation before applying to a live vehicle');
 if(b.benchOnly)throw Error('This trial uses bench-only tuning. The stock vehicle controller has no compatible live gear/rocket parameter interface.');
 if(!b.definition)throw Error('This is a rocket test plan, not a live ship/rover assembly');
 const result=RT.configureVehicle(b.definition.kind,b.definition);
 RT.persistVehicles();status('Applied validated '+b.definition.kind+' design safely: '+fmt(result.next?.massKg)+' kg.',true);
 }catch(e){status(e.message);}};
renderInputs();render();
root.StarfallResearchUI7E={open:()=>$('research7e-open').click(),store};
})(window);