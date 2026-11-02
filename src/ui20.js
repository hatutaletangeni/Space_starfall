/* STARFALL UI20 — contextual navigation without a second game state.
 * Native buttons, IDs, physics and original modal ownership remain untouched.
 */
(function(root){'use strict';
 const $=id=>document.getElementById(id),panel=$('panel'),body=document.body;
 const consoleButton=$('ui-console-open'),toggle=$('panel-toggle'),help=$('ui-help-open'),tools=$('ui-tools-toggle');
 if(!panel||!consoleButton||!toggle||!help||!tools)return;
 const openPanel=()=>{
  if(panel.classList.contains('collapsed'))toggle.click();
  panel.classList.add('ui20-expanded');
  consoleButton.setAttribute('aria-expanded','true');
 };
 const closeTools=()=>{body.classList.remove('ui20-tools-open');tools.setAttribute('aria-expanded','false');};
 const openTools=()=>{body.classList.toggle('ui20-tools-open');tools.setAttribute('aria-expanded',String(body.classList.contains('ui20-tools-open')));};
 consoleButton.addEventListener('click',()=>{
  if(panel.classList.contains('collapsed')||!panel.classList.contains('ui20-expanded'))openPanel();
  else{panel.classList.remove('ui20-expanded');consoleButton.setAttribute('aria-expanded','false');}
 });
 toggle.addEventListener('click',()=>{
  if(panel.classList.contains('collapsed')){panel.classList.remove('ui20-expanded');consoleButton.setAttribute('aria-expanded','false');}
 });
 tools.addEventListener('click',openTools);
 $('sf-quick-tools')?.addEventListener('click',e=>{if(e.target.closest('button'))closeTools();});
 help.addEventListener('click',()=>{
  body.classList.toggle('ui20-help-open');
  help.setAttribute('aria-expanded',String(body.classList.contains('ui20-help-open')));
 });
 // T16 originally prepended a dense full asset card to the always-on
 // reconnaissance surface. Keep every live source/selector and test contract,
 // but put the SAME live card after the collapsible flight computer instead.
 const liveCard=$('panel-body')?.querySelector(':scope > .op16-card');
 const flightComputer=$('fc-extra');
 if(liveCard&&flightComputer)flightComputer.after(liveCard);
 const nav=$('sf-console-nav');
 const targets=[['Overview','#panel-body .planet-meta'],['Survey','#biome-section'],['Systems','#fc-extra'],['Explore','#survey-open'],['Science','#field-open']];
 for(const [i,[name,selector]] of targets.entries()){
  const button=document.createElement('button');button.type='button';button.textContent=name;
  button.setAttribute('aria-current',i===0?'true':'false');
  button.addEventListener('click',()=>{
   const target=document.querySelector(selector);if(!target)return;
   openPanel();
   target.scrollIntoView({block:'start',behavior:'instant'});
   for(const b of nav.querySelectorAll('button'))b.setAttribute('aria-current',String(b===button));
  });
  nav.appendChild(button);
 }
 const restore=()=>{for(const b of nav.querySelectorAll('button'))b.setAttribute('aria-current',String(b===nav.firstElementChild));};
 panel.addEventListener('scroll',()=>{if(panel.scrollTop<=8)restore();},{passive:true});
 document.addEventListener('pointerdown',e=>{
  if(!e.target.closest('.sf-head-actions'))closeTools();
 });
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(body.classList.contains('ui20-help-open')){body.classList.remove('ui20-help-open');help.setAttribute('aria-expanded','false');}
  closeTools();panel.classList.remove('ui20-expanded');consoleButton.setAttribute('aria-expanded','false');
 });
 // First cockpit viewport defaults to the original chase camera, including
 // remapped keyboard controls. The existing V key remains the only viewpoint switch.
 // Only the game loop, not this module, supplies vehicle/camera state.
 body.classList.add('ui20');
 root.StarfallContextUI20={openPanel,closeTools};
})(window);