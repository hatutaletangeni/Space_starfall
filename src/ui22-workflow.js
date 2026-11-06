/* STARFALL 8E-R UI22 — one ordered mission workflow, no duplicated action ownership.
 * Existing game listeners and original source-owned actions remain authoritative. */
(function(root){'use strict';
 const $=id=>document.getElementById(id), panel=$('panel');
 if(!panel||!root.StarfallUI21)return;
 const stages=[
  {name:'Navigate',number:'01',hint:'Choose a destination and travel to it',page:'Overview',
   actions:[['STAR CHART','chart-open'],['FIND MY TRUCK','truck-plot-course8b'],['SURFACE MAP','survey-open'],['FLIGHT SYSTEMS','systems-toggle']]},
  {name:'Explore',number:'02',hint:'Land, survey and investigate',page:'Explore',
   actions:[['WORLD SURVEY','survey-open'],['FIELD LAB','field-open'],['DISCOVERIES','discovery-open'],['ECOLOGY','ecology-open'],['RUINS','ruin-open']]},
  {name:'Build',number:'03',hint:'Prepare and construct your equipment',page:'Engineer',
   actions:[['ENGINEERING WORKBENCH','workbench-open'],['ASSET MANAGER','asset-open'],['ROCKET LAB','launch-open'],['OUTPOSTS','outpost-open']]},
  {name:'Operate',number:'04',hint:'Use vehicles, machinery and missions',page:'Operate',
   actions:[['SHIP SYSTEMS','systems-toggle'],['MISSION OPERATIONS','mission-open'],['IMAGING','imaging7f-open'],['VEHICLE INVENTORY','physical8a-dialog']]},
  {name:'Records',number:'05',hint:'Save progress and review your expedition',page:'Records',
   actions:[['SAVE / RECOVERY','archive-t17-open'],['MISSION PHOTOS','imaging7f-open'],['RESEARCH','research7e-open'],['CONTROL SETTINGS','controls-open'],['FIELD MANUAL','ui-help-open']]}
 ];
 const nav=document.createElement('nav');nav.id='sf-mission-flow';nav.setAttribute('aria-label','Mission workflow');
 nav.innerHTML='<div class="sf-flow-head"><span>MISSION WORKFLOW</span><button type="button" id="sf-flow-close" aria-label="Close mission workflow">✕</button></div><div class="sf-flow-progress" aria-label="Choose the current mission stage"></div><div class="sf-flow-summary"></div><div class="sf-flow-actions"></div><div class="sf-flow-footer">Select a stage, then choose one related action. Esc closes this menu.</div>';
 document.body.appendChild(nav);
 const stagesHost=nav.querySelector('.sf-flow-progress'),actionsHost=nav.querySelector('.sf-flow-actions'),summary=nav.querySelector('.sf-flow-summary');
 let selected=0,opened=false,restoreFocus=null;
 function mode(){const r=root.StarfallRuntime;
  return r?.truckOccupied?'TRUCK':r?.shipWalking8e?'SHIP INTERIOR':r?.eva?'ON FOOT':r?.landed?'LANDED SHIP':'IN FLIGHT';}
 function paint(){
  const s=stages[selected];stagesHost.replaceChildren();actionsHost.replaceChildren();
  for(let i=0;i<stages.length;i++){const item=stages[i],b=document.createElement('button');
   b.type='button';b.className='sf-flow-step';b.setAttribute('aria-current',String(i===selected));
   b.textContent=item.number+' · '+item.name;b.addEventListener('click',()=>{selected=i;paint();});stagesHost.append(b);}
  summary.textContent=s.hint+' · '+mode();
  for(const [label,id] of s.actions){const target=$(id);
   if(!target)continue;
   const b=document.createElement('button');b.type='button';b.className='sf-flow-action';b.textContent=label;
   b.addEventListener('click',()=>{if(id==='physical8a-dialog')root.StarfallInventoryUI8A?.open?.();else target.click();close();});
   actionsHost.append(b);}
  // Advanced consoles stay accessible under their original, source-owned
  // UI21 page. They are not duplicated into the first-level action list.
  const workspace=document.createElement('button');workspace.type='button';
  workspace.className='sf-flow-action sf-flow-workspace';
  workspace.textContent='OPEN ALL '+s.name.toUpperCase()+' TOOLS';
  workspace.addEventListener('click',()=>{
   root.StarfallUI21.openRoute(s.page);
   panel.classList.remove('collapsed');panel.classList.add('ui20-expanded');
   document.body.classList.add('sf-workspace-open');
   close();
  });
  actionsHost.append(workspace);
  // Entire workflow remains navigable even if an optional subsystem is absent.
  if(!actionsHost.childElementCount){const empty=document.createElement('p');empty.textContent='No tools installed for this stage.';actionsHost.append(empty);}
 }
 function open(i){if(root.StarfallRuntime?.truckOccupied)return;
  if(Number.isInteger(i)&&i>=0&&i<stages.length)selected=i;
  restoreFocus=document.activeElement;opened=true;nav.classList.add('open');nav.setAttribute('aria-hidden','false');paint();
  nav.querySelector('.sf-flow-step[aria-current="true"]')?.focus();
  document.body.classList.add('sf-flow-open');}
 function close(){opened=false;nav.classList.remove('open');nav.setAttribute('aria-hidden','true');document.body.classList.remove('sf-flow-open');restoreFocus?.focus?.();}
 function toggle(i){opened?close():open(i);}
 nav.querySelector('#sf-flow-close').addEventListener('click',close);
 document.addEventListener('keydown',e=>{if(!opened)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
  if(e.key==='Tab'){const buttons=[...nav.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons[buttons.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 },true);
 document.addEventListener('pointerdown',e=>{if(opened&&!nav.contains(e.target)&&!e.target.closest('#sf-mission-button'))close();});
 const workspaceClose=document.createElement('button');
 workspaceClose.type='button';workspaceClose.id='sf-workspace-close';
 workspaceClose.textContent='✕ CLOSE TOOLS';
 workspaceClose.addEventListener('click',()=>{
  document.body.classList.remove('sf-workspace-open');
  panel.classList.remove('ui20-expanded');
  panel.classList.add('collapsed');
 });
 panel.querySelector('.panel-title')?.append(workspaceClose);
 const head=document.querySelector('.sf-head-actions');
 const mission=document.createElement('button');mission.type='button';mission.id='sf-mission-button';mission.textContent='MISSION';
 mission.setAttribute('aria-controls','sf-mission-flow');mission.setAttribute('aria-expanded','false');

 head?.prepend(mission);
 const origOpen=open,origClose=close;
 root.StarfallWorkflow8ER={open:i=>{origOpen(i);mission.setAttribute('aria-expanded','true');},close:()=>{origClose();mission.setAttribute('aria-expanded','false');},toggle:i=>{if(opened){origClose();mission.setAttribute('aria-expanded','false');}else{origOpen(i);mission.setAttribute('aria-expanded','true');}},stages:stages.map(x=>x.name)};
 mission.onclick=()=>{root.StarfallWorkflow8ER.toggle();};
 // A closed reconnaissance panel is now a secondary detail surface, not the main navigation.
 panel.classList.add('collapsed');
 panel.classList.remove('ui20-expanded');
 $('panel-toggle')?.setAttribute('aria-expanded','false');
 // Mode changes never expose flight/ship UI while in a truck.
 let last='';function sync(){const next=mode();if(next!==last){last=next;document.body.dataset.missionContext=next.toLowerCase().replaceAll(' ','-');
  if(opened){if(next==='TRUCK')root.StarfallWorkflow8ER.close();else paint();}
 }root.requestAnimationFrame(sync);}
 root.requestAnimationFrame(sync);
})(window);
