/* STARFALL 6J — Expedition Board UI; only reads existing gameplay evidence. */
(function(root){'use strict';
const B=root.StarfallExpeditionBoard,RT=root.StarfallRuntime,$=id=>document.getElementById(id);
if(!B||!RT)throw Error('6J Expedition Board requires the core model and flight runtime');
const key='sandbox6j';let saved=B.sanitizeSaved(SF.load()?.[key]),showSnoozed=false,shown=[],lastChanged=0;
const panels=Object.freeze({navigation:'survey-open',science:'discovery-open',archaeology:'ruin-open',biology:'ecology-open',environment:'events-open',engineering:'outpost-open'});
function snapshot(){const ctx=RT.outpostContext(),body=ctx?.body||RT.nearest,
 obs=root.StarfallScienceUI?.journal||[],exp=root.StarfallExpeditionUI,ruins=root.StarfallRuinsUI,eco=root.StarfallEcologyUI,events=root.StarfallEventsUI,world=body?.landable?body:null;
 const surface=!!(world&&ctx?.landed&&ctx.body?.id===world.id);
 return {bodyId:world?.id||'',worldName:world?.name||'',landed:surface,eva:!!ctx?.eva,timeS:RT.time,
 observations:obs,discoveries:exp?.records||[],ruins:ruins?.records||[],ecology:eco?.records||[],events:events?.records||[],interiors:root.StarfallInteriorsUI?.records||[],structures:root.StarfallOutpostUI?.store?.items||[],labPower:(()=>{const out=root.StarfallOutpostUI,rep=out?.powerReports?.get(world?.id);return (out?.store?.items||[]).filter(x=>x.bodyId===world?.id&&x.kind==='lab'&&rep?.byId?.[x.id]).map(x=>({bodyId:x.bodyId,id:x.id,powered:rep.byId[x.id].power===true}));})(),receipts:root.StarfallOutpostUI?.store?.receipts||[],waypoints:root.StarfallSurveyUI?.waypoints||[],
 candidates:surface?(exp?.candidates||[]):[],ruinSites:surface?(ruins?.visibleSites||[]):[],ecologySites:surface?(eco?.candidates||[]):[],activeEvent:surface?(events?.current?.()||null):null};}
function persist(){SF.save({[key]:saved});}
function refresh(){const state=snapshot(),reconciled=B.reconcile(saved,state),oldLen=saved.milestones.length;
 saved=reconciled.data;if(reconciled.gained.length)persist();
 const all=B.suggest(state,30),available=B.visibleTasks(all,saved,showSnoozed);shown=available;
 const summary=$('sandbox-summary'),list=$('sandbox-list'),log=$('sandbox-milestones');
 summary.textContent=state.landed?state.worldName+' · '+all.length+' optional opportunities · '+state.observations.filter(x=>x.bodyId===state.bodyId).length+' local measurements':state.bodyId?state.worldName+' · surface expedition available':'Interstellar free flight · choose a world to explore';
 if(saved.focus&&!all.some(x=>x.id===saved.focus)){saved.focus='';persist();}
 const focused=all.find(x=>x.id===saved.focus);$('sandbox-focus').textContent=focused?'CURRENT FOCUS / '+focused.title:'CURRENT FOCUS / None — select any activity to pin it';
 list.replaceChildren();if(!available.length)list.textContent='No matching activities. Try displaying snoozed suggestions, changing region or collecting additional evidence.';
 const make=(label,func,extra='')=>{const b=document.createElement('button');b.type='button';b.className='sandbox-button '+extra;b.textContent=label;b.onclick=func;return b;};
 for(const t of available){const card=document.createElement('article');card.className='sandbox-card'+(t.focused?' sandbox-focused':'');card.dataset.activityId=t.id;
  const head=document.createElement('div');head.className='sandbox-head';const title=document.createElement('strong');title.textContent=t.title;const cat=document.createElement('small');cat.textContent=t.type.toUpperCase()+' · OPTIONAL';head.append(title,cat);card.append(head);
  const detail=document.createElement('p');detail.textContent=t.detail;card.append(detail);
  const why=document.createElement('p');why.className='sandbox-reason';why.textContent='WHY NOW / '+t.reason;card.append(why);
  const actions=document.createElement('div');actions.className='sandbox-actions';actions.append(make('OPEN TOOL',()=>openTool(t.action),'sandbox-go'));
  actions.append(make(t.focused?'UNPIN':'PIN FOCUS',()=>{saved.focus=t.focused?'':t.id;if(saved.snoozed.includes(t.id))saved.snoozed=saved.snoozed.filter(x=>x!==t.id);persist();refresh();}));
  actions.append(make(t.hidden?'RESTORE':'SNOOZE',()=>{saved.snoozed=t.hidden?saved.snoozed.filter(x=>x!==t.id):[...saved.snoozed,t.id].slice(-160);if(saved.focus===t.id&&!t.hidden)saved.focus='';persist();refresh();}));card.append(actions);list.append(card);
 }
 log.replaceChildren();if(!saved.milestones.length)log.textContent='No verified field milestones yet. Activities are suggested, never required.';
 for(const r of [...saved.milestones].reverse().slice(0,40)){const p=document.createElement('div');p.className='sandbox-milestone';p.textContent='✓ '+r.label+' · t='+r.timeS+'s'+(r.bodyId?' · '+r.bodyId:'');log.append(p);}
 $('sandbox-archived').textContent=saved.milestones.length+' verified evidence milestone(s) · '+(all.length-available.length)+' filtered suggestions';
 return{all,available,gained:reconciled.gained};}
function openTool(id){const target=$(id);if(!target){$('sandbox-status').textContent='This tool is currently unavailable.';return false;}
 $('sandbox-panel').hidden=true;document.activeElement?.blur?.();target.click();return true;}
function open(){if(!saved.visible)saved.visible=true;$('sandbox-panel').hidden=false;$('sandbox-show-snoozed').checked=showSnoozed;refresh();}
function close(){$('sandbox-panel').hidden=true;document.activeElement?.blur?.();}
$('sandbox-open').onclick=open;$('sandbox-close').onclick=close;
$('sandbox-panel').addEventListener('click',e=>{if(e.target===$('sandbox-panel'))close();});
$('sandbox-panel').addEventListener('keydown',e=>{if(e.key==='Escape'){close();e.stopPropagation();}});
$('sandbox-refresh').onclick=refresh;$('sandbox-show-snoozed').onchange=e=>{showSnoozed=e.target.checked;refresh();};
$('sandbox-restore').onclick=()=>{saved.snoozed=[];saved.focus='';persist();refresh();};
$('sandbox-export').onclick=()=>{const payload={schema:1,model:'optional suggestions based on confirmed in-game evidence, not mandatory missions',galaxySeed:RT.galaxy.seed,simTimeS:RT.time,milestones:saved.milestones,focus:saved.focus,notes:'No currency, experience, level, progression lock, or simulated research result is awarded.'};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='starfall-field-milestones.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
addEventListener('pagehide',persist);
// Poll only while the panel is open; no extra work in the flight render loop.
const observer=setInterval(()=>{if(document.hidden||$('sandbox-panel').hidden)return;refresh();},2500);
root.StarfallSandboxUI={open,close,refresh,snapshot,get tasks(){return shown.map(x=>({...x}));},get saved(){return B.sanitizeSaved(saved);},observer};
})(globalThis);
