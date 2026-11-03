/* STARFALL 6I — Event observations, safe visual cues, immutable journal links. */
(function(root){'use strict';
const EV=root.StarfallEvents,RT=root.StarfallRuntime,FS=root.StarfallFieldScience,$=id=>document.getElementById(id);
if(!EV||!RT||!FS)throw Error('Planetary event UI requires runtime, events and field science');
const state=SF.load()?.events6i,records=EV.sanitize(state?.records);let latest=null,observedId='',lastVisual=-Infinity;let visualEffects=state?.visualEffects!==false;
function context(){const ctx=RT.outpostContext();return ctx.body?.landable&&ctx.landed&&ctx.local&&!RT.interiorState?ctx:null;}
function current(){const ctx=context();return ctx?EV.evaluate(ctx.body,ctx.local,RT.time,RT.galaxy.seed):null;}
function persist(){SF.save({events6i:{schema:1,records:records.slice(-250),visualEffects}});}
function findRecord(ev){return records.find(x=>x.id===ev.id&&x.bodyId===ev.bodyId);}
function status(message,error=false){const e=$('events-status');e.textContent=message;e.style.color=error?'#ffaf9a':'#e5c78c';}
function record(){const ctx=context(),ev=current();if(!ctx||!ev)throw Error('No active planetary event here right now.');
 if(!ctx.eva&&!ctx.roverOccupied)throw Error('Exit the spacecraft or use the rover to observe an event.');
 const prev=findRecord(ev);if(prev)return prev;
 const obj={id:ev.id,bodyId:ev.bodyId,kind:ev.kind,timeS:RT.time,local:[...ctx.local],intensity:Math.round(ev.intensity*1e5)/1e5,measurementIds:[],note:''};records.push(obj);if(records.length>250)records.shift();persist();observedId=obj.id;return obj;}
function linked(rec){const ctx=context();if(!ctx)throw Error('Return to this world to link instrument evidence');const event=EV.timeline(ctx.body,RT.galaxy.seed,Math.floor(rec.timeS/EV.SLOT));if(!event||event.id!==rec.id||ctx.body.id!==rec.bodyId)throw Error('This observation belongs to another event or world.');
 const instrument=EV.TYPES[rec.kind].instrument,journal=root.StarfallScienceUI?.journal||[];
 const measurements=journal.filter(o=>o.instrument===instrument&&o.bodyId===rec.bodyId&&Number.isFinite(o.timeS)&&o.timeS>=event.startS&&o.timeS<=event.endS+90&&Array.isArray(o.location)&&EV.arc(o.location,rec.local,ctx.body.radius)<=90);
 const newIDs=measurements.map(o=>o.id).filter(id=>!rec.measurementIds.includes(id));if(!newIDs.length)throw Error('No matching '+instrument+' reading within 90 units and the event time window. Use FIELD SCIENCE to take one.');rec.measurementIds=[...new Set([...rec.measurementIds,...newIDs])].slice(-8);persist();return newIDs.length;
}
function refresh(){const ctx=context(),ev=current(),name=$('events-current'),list=$('events-journal');latest=ev;
 name.textContent=!ctx?'Land on a solid world to monitor environmental activity.':!ev?ctx.body.name+' · environmental monitoring · no active local event':ev.name.toUpperCase()+' · '+ctx.body.name+' · '+Math.round(ev.intensity*100)+'% modeled intensity\n'+ev.description+'\nVisibility factor '+ev.visibility.toFixed(2)+' · solar transmission '+ev.solarFactor.toFixed(2)+' · instrument '+ev.instrument+'\nTime remaining '+Math.max(0,ev.endS-RT.time).toFixed(0)+' simulated seconds';
 if(ctx&&root.StarfallGeothermalLW01){
  const geo=root.StarfallGeothermalLW01,sites=geo.sources(ctx.body,RT.galaxy.seed);
  if(sites.length){
   const p=root.StarfallFieldScience.profile(ctx.body,RT.galaxy.seed),d=ctx.local;
   let nearest=null;
   for(const site of sites){const dot=Math.max(-1,Math.min(1,d[0]*site.direction[0]+d[1]*site.direction[1]+d[2]*site.direction[2]));
    const distanceKm=Math.acos(dot)*ctx.body.radius;
    if(!nearest||distanceKm<nearest.distanceKm)nearest={site,distanceKm};
   }
   const activity=geo.pulse(nearest.site,RT.time,p.pressurePa,Math.max(.25,(ctx.body.gravity||1)*9.80665));
   name.textContent+='\\nGEOTHERMAL MODEL: '+sites.length+' candidate vent(s); nearest '+nearest.site.kind+' '+nearest.distanceKm.toFixed(1)+' km away.'+
    '\\nHeat flux '+nearest.site.thermalFluxWm2.toFixed(2)+' W/m² · '+(activity.active?'ERUPTING':'RECHARGING')+
    ' · mass flow '+activity.massFlowKgS.toFixed(1)+' kg/s (modeled, not measured).' +
    '\\nReservoir '+(activity.reservoirRemainingKg/1e6).toFixed(2)+' million kg · fluid '+(activity.volatileSpecies||'unknown')+
    (activity.ashMassFlowKgS>0?' · ASH DISCHARGE: solar attenuation nearby':'')+
    (nearest.distanceKm<.4&&activity.active?' · DANGER: ACTIVE HOT VENT — retreat and use instruments from a safe distance':'');
  }
 }
 list.replaceChildren();if(!records.length)list.textContent='No environmental observations recorded.';
 for(const r of records.slice(-35).reverse()){const button=document.createElement('button');button.type='button';button.className='events-entry'+(r.id===observedId?' active':'');button.textContent=EV.TYPES[r.kind].name+' · '+r.bodyId+' · '+Math.round(r.intensity*100)+'% · '+r.measurementIds.length+' linked';button.onclick=()=>{observedId=r.id;$('events-notes').value=r.note;for(const b of list.querySelectorAll('button'))b.classList.toggle('active',b===button);};list.append(button);}
 if(!observedId&&records.length)observedId=records.at(-1).id;
 const r=records.find(x=>x.id===observedId);$('events-notes').value=r?.note||'';
}
function exportJournal(){const data={schema:1,seed:RT.galaxy.seed,model:'6I seeded environmental phenomena; observations are in-game hypotheses',records},url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='starfall-planetary-events.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),900);}
function visual(){const v=$('weather-veil'),banner=$('weather-hud'),ctx=context(),e=current();if(!ctx||!e){v.className='weather-veil';v.style.opacity='0';banner.hidden=true;return;}
 v.className=visualEffects?'weather-veil weather-'+e.kind:'weather-veil';v.style.opacity=visualEffects?String(Math.min(.55,Math.max(0,e.intensity*.46))):'0';
 banner.hidden=false;banner.textContent=e.name.toUpperCase()+' · '+Math.round(e.intensity*100)+'% · SURFACE EVENT';}
function tick(){const t=performance.now();if(t-lastVisual<350)return;lastVisual=t;visual();if(!$('events-panel').hidden)refresh();}
$('events-visual-effects').checked=visualEffects;
$('events-visual-effects').onchange=()=>{visualEffects=$('events-visual-effects').checked;persist();visual();};
$('events-open').onclick=()=>{$('events-panel').hidden=false;refresh();};$('events-close').onclick=()=>{$('events-panel').hidden=true;document.activeElement?.blur?.();};
$('events-panel').addEventListener('click',e=>{if(e.target===$('events-panel')){$('events-panel').hidden=true;document.activeElement?.blur?.();}});
$('events-panel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();$('events-panel').hidden=true;document.activeElement?.blur?.();}});
$('events-observe').onclick=()=>{try{const r=record();observedId=r.id;status('Event observation saved. Take a '+EV.TYPES[r.kind].instrument+' reading during the event to add evidence.');refresh();}catch(e){status(e.message,true);}};
$('events-link').onclick=()=>{try{const r=records.find(x=>x.id===observedId);if(!r)throw Error('First save an event observation.');const n=linked(r);status(n+' instrument measurement(s) linked to this event.');refresh();}catch(e){status(e.message,true);}};
$('events-save').onclick=()=>{const r=records.find(x=>x.id===observedId);if(!r){status('Select a saved observation.',true);return;}r.note=$('events-notes').value.slice(0,1000);persist();status('Event field notes saved.');};
$('events-export').onclick=exportJournal;
root.StarfallEventsUI={tick,current,refresh,get records(){return records.map(x=>({...x,measurementIds:[...x.measurementIds]}));},get active(){return latest;},observe:record,link:linked};
})(globalThis);
