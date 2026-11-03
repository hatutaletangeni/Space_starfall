/* STARFALL UI21 — compact intent navigation and contextual field manual.
 * Presentation only. Existing buttons, listeners and simulation stores are reused.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id), panel=$('panel'), oldNav=$('sf-console-nav'), content=$('panel-body'), question=$('ui-help-open');
if(!panel||!oldNav||!content||!question)return;
const sections={
 Explore:['biome-section','survey-open','field-open','discovery-open','ecology-open','ruin-open','interior-open','events-open','sandbox-open'],
 Engineer:['systems-toggle','workbench-open','asset-open','launch-open','outpost-open'],
 Operate:['fc-extra','imaging7f-open'],
 Records:['imaging7f-open','discovery-open','events-open']
};
const titles={
 Explore:'Select a destination, survey a world, then investigate its discoveries.',
 Engineer:'Inspect hardware, configure a design, build and validate it.',
 Operate:'Choose an active vehicle or mission, then execute and monitor.',
 Records:'Review scientific evidence, photographs, discoveries and logs.'
};
const panelHeader=panel.querySelector('.panel-title');
const header=document.createElement('div');header.id='ui21-navigation';header.setAttribute('role','navigation');header.setAttribute('aria-label','Starfall feature navigation');
const pages=document.createElement('div');pages.id='ui21-pages';
const original=[...content.children], moved=new Set();
const pageMap={};
function moveSectionTo(page,id){
 const el=$(id);if(!el)return false;
 const section=el.closest('.section')||el;
 // Preserve legacy event handlers by moving, never cloning or replacing the control.
 if(!content.contains(section))return false;
 if(moved.has(section))return false;
 page.appendChild(section);moved.add(section);return true;
}
for(const name of ['Explore','Engineer','Operate','Records']){
 const page=document.createElement('div');page.className='ui21-page';page.dataset.page=name;page.hidden=true;
 const intro=document.createElement('p');intro.className='ui21-intro';intro.textContent=titles[name];page.appendChild(intro);
 pageMap[name]=page;pages.appendChild(page);
 for(const id of sections[name])moveSectionTo(page,id);
}
const overview=document.createElement('div');overview.className='ui21-page';overview.dataset.page='Overview';overview.hidden=true;
const overviewIntro=document.createElement('p');overviewIntro.className='ui21-intro';overviewIntro.textContent='Your current surroundings, basic surveys and flight status.';overview.appendChild(overviewIntro);
for(const el of [...content.children]){if(el!==pages && el!==overview && !el.closest?.('#ui21-pages'))overview.appendChild(el);}
pages.prepend(overview);content.appendChild(pages);pageMap.Overview=overview;
// Only the active page is painted. No subsystem code or data is replaced.
const routes=['Overview','Explore','Engineer','Operate','Records'];
let current='Overview';let lastFocus=null;
function openRoute(name){
 if(!pageMap[name])return;
 current=name;
 for(const [key,page] of Object.entries(pageMap))page.hidden=key!==name;
 for(const button of header.querySelectorAll('button[data-route]')){
  const active=button.dataset.route===name;
  button.setAttribute('aria-current',String(active));
 }
 panel.classList.add('ui21-active','ui20-expanded');
 if(panel.classList.contains('collapsed'))$('panel-toggle')?.click();
 $('ui-console-open')?.setAttribute('aria-expanded','true');
 panel.scrollTop=0;
}
for(const name of routes){
 const button=document.createElement('button');button.type='button';button.dataset.route=name;button.textContent=name;button.setAttribute('aria-current','false');
 button.addEventListener('click',()=>openRoute(name));header.appendChild(button);
}
oldNav.replaceWith(header);openRoute('Overview');
const quick=document.createElement('div');quick.id='ui21-quick';
const quickActions=[['Star Chart','chart-open','Explore'],['Observatory','obs-open','Explore'],['Rocket Lab','launch-open','Engineer'],['Asset Manager','asset-open','Engineer'],['Control Settings','controls-open','Operate'],['Save / Recovery','archive-t17-open','Records']];
for(const [label,id,route] of quickActions){
 const source=$(id);if(!source)continue;
 const b=document.createElement('button');b.type='button';b.textContent=label;
 b.addEventListener('click',()=>{openRoute(route);source.click();});quick.appendChild(b);
}
pageMap.Explore.prepend(quick);
// Utility and existing operational controls remain accessible from original header.
// Place short routing links within Records when the underlying feature lives in another route.
for(const [label,id] of [['Mission Photos','imaging7f-open'],['Field Journal','discovery-open'],['Planetary Events','events-open'],['Science Research','research7e-open']]){
 const b=document.createElement('button');b.type='button';b.className='ui21-link';b.textContent=label;
 b.addEventListener('click',()=>{const source=$(id);if(source)source.click();else root.alert?.('This feature is not loaded in this build.');});
 pageMap.Records.appendChild(b);
}
// Help is self-contained so it does not require a server, fetch, or external dependencies.
const guide=[
 ['Start Here','Getting started','Open Star Chart (M) or select a real star in the sky. Select a destination, align with G, then use Shift+W to warp where allowed. Approach a planet manually and descend through its atmosphere; touchdown begins EVA. Walk onto the ship rear ramp to board again.','Navigation target and a flight-capable ship','If warp is unavailable, check mode, distance, destination and alignment.'],
 ['Controls','Ship, EVA and truck','W/S control forward motion and braking, A/D steer on the surface, mouse drag steers or looks depending on button, scroll adjusts camera distance, V changes camera, T cycles time rate, L controls lights. The four-wheel truck uses X for deliberate entry and exit; the six-wheel science rover is not rideable. Open Control Settings for remapping/inversion.','Appropriate active mode','If directions feel reversed, adjust inversion in Control Settings. Remapped keys take precedence over these defaults.'],
 ['Navigation','Stars, maps and warp','Every twinkling star is an actual deterministic star system. Use the Star Chart for interstellar destinations and the Planetary Survey Map for surface waypoints and measured areas. Distant planetary details load only as needed.','A selected valid destination','Align the craft and verify warp restrictions if travel does not start.'],
 ['Exploration','Surface science and ruins','After landing, open Explore for survey scans, instruments, planetary map, anomalies, ecology and ruins. Scientific instruments have range, operating conditions and uncertainty. Ruin interiors are accessible only where generated and physically reachable.','A nearby world or surface','A barren planet may lack biology; a ruin may not have an enterable interior.'],
 ['Engineering','Vehicles and electric power','Open Engineer to inspect ship and vehicle systems, use the Engineering Workbench, design rockets, and construct outposts. Power flows only through valid connected sources and loads in engineering simulation. Solar panels depend on illumination and eclipses.','Compatible hardware and safe operating state','No power: inspect wiring, switch state, sunlight, battery charge, component faults and connector limits.'],
 ['Rocket Lab','Stages, launch and orbit','In Engineer, open Rocket Lab. Configure stages, dry mass, fuel, engines and payload; inspect thrust-to-weight ratio (TWR), available delta-v, target orbit and pad readiness. A real force-integrated launch can fail from gravity, drag, staging or propellant limits.','A valid launch pad and rocket design','If orbit fails, compare TWR, actual staging, fuel remaining and ascent telemetry instead of relying on a success percentage.'],
 ['Operations','Rovers, satellites and communications','Operate a rover through validated commands, inspect satellites and transmission jobs and capture photographs. Remote operations require reachable powered endpoints, line-of-sight, sufficient storage, available bandwidth and transmission time. Ordinary radio is not instantaneous; any faster interstellar transport is fictional.','Powered instrument and communication route','Pending photograph: check capture state, onboard storage, link visibility, data backlog and final downlink receipt.'],
 ['Records','Research, photos and evidence','Records links to the existing science journal, mission photo gallery, event history and research bench. Evidence keeps its originating instrument, world, time, measurements and uncertainty where supported. Review or export without creating a second save store.','A recorded observation or completed received transfer','An image onboard a rover is not yet in the received gallery.'],
 ['Troubleshooting','Common failures','Cannot board? Walk onto the rear ship ramp; the truck uses X, and the science rover is non-rideable. Cannot warp? Check current mode, target and distance. No solar? Inspect eclipse, connection and battery. Rover stopped? Check slope, charge, command safety and link. FPS low? Reduce graphics load and inspect Diagnostics.','Relevant vehicle or equipment','Save before risky changes. Open Diagnostics for performance, backup and recovery.'],
 ['Glossary','Engineering terms','Apoapsis: highest orbital point. Periapsis: lowest orbital point. Delta-v: ideal velocity-change capability. TWR: thrust divided by local weight. LOS: line-of-sight radio path. Joule (J): stored energy. Watt (W): energy each second. Telemetry: measured operating data. Calibration: aligning instrument output to a known reference. Biome: environmental region.','None','The game combines physical laws, simplified engineering and clearly fictional warp technology.']
];
const overlay=document.createElement('section');overlay.id='ui21-manual';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Starfall Field Manual');
overlay.innerHTML='<div class="ui21-manual-window"><header><div><small>STARFALL / KNOWLEDGE BASE</small><h2>Field Manual</h2></div><button id="ui21-manual-close" type="button" aria-label="Close Field Manual">✕</button></header><input type="search" id="ui21-manual-search" placeholder="Search controls, equipment, problems…" aria-label="Search Field Manual"><div class="ui21-manual-content"><nav id="ui21-manual-topics" aria-label="Manual topics"></nav><article id="ui21-manual-article" tabindex="-1"></article></div><footer>Use Escape to close · All guides work offline</footer></div>';
document.body.appendChild(overlay);
const topics=$('ui21-manual-topics'),article=$('ui21-manual-article'),search=$('ui21-manual-search');
let selected=0;
function showArticle(i){
 if(!guide[i])return;selected=i;
 const [category,title,description,requires,failure]=guide[i];
 article.replaceChildren();
 const h=document.createElement('h3');h.textContent=title;article.appendChild(h);
 for(const [heading,value] of [['What it does / how to use',description],['Prerequisites',requires],['Common issues',failure]]){
 const sub=document.createElement('h4');sub.textContent=heading;
 const p=document.createElement('p');p.textContent=value;article.append(sub,p);
 }
 const next=document.createElement('div');next.className='ui21-manual-step';
 for(const [label,target] of [['← Previous',(i+guide.length-1)%guide.length],['Next →',(i+1)%guide.length]]){
 const b=document.createElement('button');b.textContent=label;b.type='button';b.addEventListener('click',()=>showArticle(target));next.appendChild(b);
 }article.appendChild(next);
 for(const b of topics.querySelectorAll('button'))b.setAttribute('aria-current',String(+b.dataset.index===i));
}
function listTopics(query=''){
 topics.replaceChildren();
 guide.forEach(([cat,title,desc,pre,fail],i)=>{
 if(!(cat+' '+title+' '+desc+' '+pre+' '+fail).toLowerCase().includes(query.toLowerCase()))return;
 const b=document.createElement('button');b.type='button';b.dataset.index=i;b.textContent=cat+' · '+title;b.addEventListener('click',()=>showArticle(i));topics.appendChild(b);
 });
 if(!topics.children.length){const p=document.createElement('p');p.textContent='No matching articles. Try a vehicle, instrument or issue.';topics.appendChild(p);}
 showArticle(selected);
}
function closeManual(){overlay.hidden=true;document.body.classList.remove('ui20-help-open');question.setAttribute('aria-expanded','false');if(lastFocus?.focus)lastFocus.focus();}
function openManual(){
 lastFocus=document.activeElement;overlay.hidden=false;document.body.classList.remove('ui20-help-open');question.setAttribute('aria-expanded','true');listTopics(search.value);search.focus();
}
question.setAttribute('aria-controls','ui21-manual');question.title='Search the Starfall Field Manual';
question.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(overlay.hidden)openManual();else closeManual();},true);
$('ui21-manual-close').addEventListener('click',closeManual);
overlay.addEventListener('click',e=>{if(e.target===overlay)closeManual();});
search.addEventListener('input',()=>{selected=0;listTopics(search.value);});
document.addEventListener('keydown',e=>{
 if(overlay.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeManual();return;}
 if(e.key==='Tab'){
 const controls=[...overlay.querySelectorAll('button:not([hidden]),input:not([hidden])')].filter(x=>x.offsetParent!==null);
 if(!controls.length)return;
 const first=controls[0],last=controls[controls.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
},true);
root.StarfallUI21={openRoute,openManual,closeManual};
})(window);
